import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../errors/app-error.js';

export interface GroundedCitation {
  pageNumber: number;
  chunkId: string;
  excerpt: string;
}

export interface GenerationResult {
  answer: string;
  citations: GroundedCitation[];
}

export class GoogleGenAIService {
  private ai: GoogleGenAI | null = null;
  private readonly embeddingModel = 'gemini-embedding-001';
  private readonly chatModel = 'gemini-2.5-flash';
  private readonly embeddingDimension = 1536;

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
      try {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        logger.info('Google GenAI SDK initialized successfully');
      } catch (err) {
        logger.error('Failed to initialize Google GenAI SDK', err);
      }
    } else {
      logger.warn('⚠️ GEMINI_API_KEY is not configured in .env. Real model calls will require an API key.');
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        return this.ai;
      }
      throw new AppError(
        'GEMINI_API_KEY is required to generate embeddings and answers. Please set GEMINI_API_KEY in backend/.env',
        400,
        'MISSING_GEMINI_API_KEY'
      );
    }
    return this.ai;
  }

  /**
   * Generates a dense vector embedding for a single piece of text (1536 dimensions)
   */
  async embedText(text: string): Promise<number[]> {
    const ai = this.getClient();
    try {
      const response = await ai.models.embedContent({
        model: this.embeddingModel,
        contents: text,
        config: {
          outputDimensionality: this.embeddingDimension,
        },
      });

      const vector = response.embeddings?.[0]?.values;
      if (!vector || !Array.isArray(vector)) {
        throw new Error('Failed to retrieve vector array from Google GenAI embedding response');
      }
      return vector;
    } catch (error) {
      logger.error('Error generating text embedding', error);
      throw error;
    }
  }

  /**
   * Generates embeddings for an array of texts in batches
   */
  async embedBatch(texts: string[], batchSize = 20): Promise<number[][]> {
    if (texts.length === 0) return [];
    const ai = this.getClient();
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      try {
        const response = await ai.models.embedContent({
          model: this.embeddingModel,
          contents: batch,
          config: {
            outputDimensionality: this.embeddingDimension,
          },
        });

        const embeddings = response.embeddings;
        if (!embeddings || embeddings.length !== batch.length) {
          const individualVectors = await Promise.all(batch.map((t) => this.embedText(t)));
          results.push(...individualVectors);
        } else {
          for (const item of embeddings) {
            if (!item.values || !Array.isArray(item.values)) {
              throw new Error('Invalid vector format received from Google GenAI batch embedding');
            }
            results.push(item.values);
          }
        }
      } catch (error) {
        logger.warn('Batch embedding failed, falling back to individual embeddings', {
          error: error instanceof Error ? error.message : String(error),
        });
        const fallbackVectors = await Promise.all(batch.map((t) => this.embedText(t)));
        results.push(...fallbackVectors);
      }
    }

    return results;
  }

  /**
   * Generates a grounded natural language answer given retrieved document chunks
   */
  async generateGroundedAnswer(
    question: string,
    contextChunks: Array<{
      chunkId: string;
      text: string;
      pageNumber: number;
      score: number;
    }>
  ): Promise<GenerationResult> {
    const ai = this.getClient();

    if (contextChunks.length === 0) {
      return {
        answer: 'I could not find relevant passages in the document to answer your question.',
        citations: [],
      };
    }

    // Format context with explicit citation anchors
    const contextText = contextChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1} | Page ${c.pageNumber}]:\n${c.text}`
      )
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert academic and technical AI reading assistant.
Your task is to answer the user's question accurately, strictly based on the provided document excerpts.
Rules:
1. Rely ONLY on the provided document excerpts. Do not fabricate details.
2. If the excerpts do not contain enough information to answer the question, clearly state that the document does not contain this information.
3. Be clear, concise, and structured.
4. Reference the specific page number(s) where the evidence was found.`;

    const userPrompt = `DOCUMENT EXCERPTS:
${contextText}

QUESTION:
${question}

Provide a direct, helpful, and grounded answer based on the excerpts above.`;

    try {
      const response = await ai.models.generateContent({
        model: this.chatModel,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.2, // Low temperature for factual precision
        },
      });

      const answerText = response.text || 'No response generated.';

      const citations: GroundedCitation[] = contextChunks.map((c) => ({
        pageNumber: c.pageNumber,
        chunkId: c.chunkId,
        excerpt: c.text.length > 200 ? c.text.slice(0, 197) + '...' : c.text,
      }));

      return {
        answer: answerText,
        citations,
      };
    } catch (error) {
      logger.error('Error generating grounded answer via Gemini', error);
      throw error;
    }
  }
}

export const googleGenAIService = new GoogleGenAIService();
