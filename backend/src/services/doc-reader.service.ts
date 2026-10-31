import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { chunkPages, DocumentChunk, PageContent } from '../utils/chunker.js';
import { googleGenAIService, GenerationResult } from '../integrations/google-genai.service.js';
import { qdrantService, ScoredChunk } from '../integrations/qdrant.service.js';
import { logger } from '../utils/logger.js';
import { BadRequestError } from '../errors/app-error.js';

export interface ProcessUploadOptions {
  fileBuffer: Buffer;
  filename: string;
  question?: string;
}

export interface UploadProcessResult {
  documentId: string;
  filename: string;
  chunksCount: number;
  status: string;
  message?: string;
  answer?: string;
  citations?: Array<{
    pageNumber: number;
    chunkId: string;
    excerpt: string;
  }>;
}

export interface AnswerQuestionResult {
  question: string;
  documentId?: string;
  answer: string;
  citations: Array<{
    pageNumber: number;
    chunkId: string;
    excerpt: string;
  }>;
  retrievedChunksCount: number;
}

export interface DocumentHistoryRecord {
  id: string;
  title: string;
  uploadedAt: string;
  questionsAsked: number;
  status: string;
  chunksCount: number;
}

export class DocReaderService {
  // In-memory registry of uploaded documents for quick history lookups
  private documentsHistory: Map<string, DocumentHistoryRecord> = new Map([
    [
      'default-doc-1',
      {
        id: 'default-doc-1',
        title: 'Q3_Financial_Performance_Report.pdf',
        uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        questionsAsked: 6,
        status: 'ready',
        chunksCount: 18,
      },
    ],
    [
      'default-doc-2',
      {
        id: 'default-doc-2',
        title: 'System_Architecture_DocReader_v2.pdf',
        uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        questionsAsked: 14,
        status: 'ready',
        chunksCount: 24,
      },
    ],
  ]);

  /**
   * Complete pipeline for handling PDF upload, binary conversion via fs.readFileSync,
   * text extraction, recursive chunking, Google GenAI embeddings, and Qdrant storage.
   * If a question is passed simultaneously, immediately generates and returns the answer.
   */
  async processPdfUpload(options: ProcessUploadOptions): Promise<UploadProcessResult> {
    const { fileBuffer, filename, question } = options;
    const documentId = crypto.randomUUID();

    // 1 & 2. Write to a temporary file and convert the PDF data into binary by using fs.readFileSync
    const tempFilePath = path.join(os.tmpdir(), `docreader-${Date.now()}-${filename}`);
    fs.writeFileSync(tempFilePath, fileBuffer);
    const binaryData = fs.readFileSync(tempFilePath);

    try {
      logger.info(`Extracting text from PDF: ${filename} using pdf-parse...`);

      // 3. Extract text from binary data using pdf-parse
      let pages: PageContent[] = [];
      try {
        const parser = new PDFParse({ data: binaryData });
        const textResult = await parser.getText();

        if (textResult.pages && textResult.pages.length > 0) {
          pages = textResult.pages.map((p) => ({
            pageNumber: p.num,
            text: p.text || '',
          }));
        } else if (textResult.text) {
          pages = [{ pageNumber: 1, text: textResult.text }];
        }
      } catch (parseErr) {
        logger.error('Failed to parse PDF binary data', parseErr);
        throw new BadRequestError('Failed to parse PDF file. Ensure the file is a valid unencrypted PDF.');
      }

      if (pages.length === 0 || pages.every((p) => p.text.trim().length === 0)) {
        throw new BadRequestError(
          'No text content could be extracted from this PDF. Scanned or image-only PDFs require OCR.'
        );
      }

      // 4. Advanced Recursive Character Chunking with Overlap (500–800 chars, 100 overlap)
      const chunks: DocumentChunk[] = chunkPages(pages, documentId, filename, {
        chunkSize: 700,
        chunkOverlap: 100,
      });

      if (chunks.length === 0) {
        throw new BadRequestError('Document does not contain sufficient text to generate chunks.');
      }

      logger.info(`Generated ${chunks.length} recursive text chunks for "${filename}". Generating embeddings...`);

      // 5. Generate vector embeddings using Google GenAI (text-embedding-004, 768 dimensions)
      const chunkTexts = chunks.map((c) => c.text);
      const embeddings = await googleGenAIService.embedBatch(chunkTexts);

      // 6. Store embeddings, text, and length in Qdrant Vector Database
      await qdrantService.upsertChunks(chunks, embeddings);

      // Save document to history
      const historyRecord: DocumentHistoryRecord = {
        id: documentId,
        title: filename,
        uploadedAt: new Date().toISOString(),
        questionsAsked: question ? 1 : 0,
        status: 'ready',
        chunksCount: chunks.length,
      };
      this.documentsHistory.set(documentId, historyRecord);

      // 7. Simultaneous upload & question: If the user asked a question while uploading
      if (question && question.trim().length > 0) {
        logger.info(`Question provided with upload for "${filename}": "${question}". Querying immediately...`);
        const queryVector = await googleGenAIService.embedText(question);
        const topChunks = await qdrantService.searchSimilarChunks(queryVector, documentId, 4);

        const generation: GenerationResult = await googleGenAIService.generateGroundedAnswer(
          question,
          topChunks
        );

        return {
          documentId,
          filename,
          chunksCount: chunks.length,
          status: 'ready',
          answer: generation.answer,
          citations: generation.citations,
          message: 'PDF processed, indexed, and initial question answered successfully.',
        };
      }

      return {
        documentId,
        filename,
        chunksCount: chunks.length,
        status: 'ready',
        message: 'PDF uploaded, extracted, chunked, and indexed in Qdrant successfully.',
      };
    } finally {
      // Clean up temporary disk file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupErr) {
        logger.warn('Failed to clean up temporary upload file', {
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      }
    }
  }

  private isThanksQuery(text: string): boolean {
    const cleaned = text
      .trim()
      .toLowerCase()
      .replace(/[?!.,;:!~@#$%^&*()_+=<>/{}[\]|\\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return false;

    const singleWordThanks = new Set([
      'thanks',
      'thankyou',
      'thank',
      'thx',
      'thnx',
      'thnk',
      'thnks',
      'thnka',
      'thnkz',
      'ty',
      'tysm',
      'appreciated',
    ]);
    if (singleWordThanks.has(cleaned)) {
      return true;
    }

    const thanksPatterns = [
      /^(thank|thanks|thnka|thnk|thanku|thx|thnx|ty|tysm)(\s+(you|u|atlas|so\s+much|very\s+much|a\s+lot|again))*$/,
      /^(thank\s+(you|u)|thnka\s+(you|u)|thnk\s+(you|u))\s*(so\s+much|very\s+much|a\s+lot|atlas)?$/,
      /^(many\s+thanks)(\s+atlas)?$/,
      /^(much\s+appreciated)(\s+atlas)?$/,
      /^(i\s+)?appreciate\s+(it|this|your\s+help)(\s+atlas)?$/,
      /^(good|great|awesome|wonderful|nice)\s+job(\s+atlas)?$/,
    ];

    return thanksPatterns.some((pattern) => pattern.test(cleaned));
  }

  private isConversationalQuery(text: string): boolean {
    const cleaned = text
      .trim()
      .toLowerCase()
      .replace(/[?!.,;:!~@#$%^&*()_+=<>/{}[\]|\\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return true;

    const singleWordGreetings = new Set([
      'hi', 'hii', 'hiii', 'hello', 'helloo', 'hellooo', 'hey', 'heyy', 'heyyy',
      'hola', 'howdy', 'greetings', 'sup', 'yo'
    ]);
    if (singleWordGreetings.has(cleaned)) {
      return true;
    }

    const conversationalPatterns = [
      /^(hi|hello|hey|hola|greetings|howdy|yo)\s+(atlas|there|docreader|bot|friend)?$/,
      /^(good\s+(morning|afternoon|evening|day|night))(\s+atlas)?$/,
      /^(who\s+are\s+(you|u))(\s+atlas)?$/,
      /^(what\s+is\s+your\s+name)(\s+atlas)?$/,
      /^(what\s+can\s+(you|u)\s+do)$/,
      /^(what\s+do\s+(you|u)\s+do)$/,
      /^(who\s+is\s+atlas)$/,
      /^(what\s+is\s+atlas)$/,
      /^(how\s+are\s+(you|u))(\s+doing)?$/,
      /^(what\s*'?s\s+up)$/,
      /^(help(\s+me)?)$/,
      /^(how\s+to\s+use(\s+this)?)$/,
      /^(how\s+does\s+this\s+work)$/,
      /^(tell\s+me\s+about\s+yourself)$/
    ];

    return conversationalPatterns.some((pattern) => pattern.test(cleaned));
  }

  /**
   * Question answering workflow:
   * 1. Embed user question using Google GenAI
   * 2. Search Qdrant for top matching chunks using Cosine similarity
   * 3. Prompt Gemini (gemini-2.5-flash) with retrieved context to generate grounded answer
   */
  async answerQuestion(question: string, documentId?: string): Promise<AnswerQuestionResult> {
    if (!question || question.trim().length === 0) {
      throw new BadRequestError('Question must not be empty.');
    }

    logger.info(`Processing Q&A query: "${question}" (documentId: ${documentId || 'all'})`);

    // Handle "thank you" / gratitude queries with a warm, welcoming reply
    if (this.isThanksQuery(question)) {
      logger.info(`Recognized gratitude/thanks query: "${question}". Returning welcome response.`);
      return {
        question,
        documentId,
        answer:
          "You're very welcome! 😊 I'm always happy to help. Let me know if you need more insights, summaries, or citations from your documents!",
        citations: [],
        retrievedChunksCount: 0,
      };
    }

    // Handle conversational greetings and introductions without querying vector database
    if (this.isConversationalQuery(question)) {
      logger.info(`Recognized conversational query: "${question}". Returning Atlas introduction.`);
      return {
        question,
        documentId,
        answer:
          "Hello! I am Atlas, your AI document reading specialist.\n\nHere is what I can do:\n- Extract, recursively chunk, and generate dense vector embeddings from your PDF, DOCX, or TXT documents.\n- Perform semantic cosine similarity search to retrieve exact relevant passages.\n- Provide factually grounded answers with verified page citations and reasoning criteria.\n\nTo get started, please attach or upload a PDF document and ask any question about its contents!",
        citations: [],
        retrievedChunksCount: 0,
      };
    }

    // 10. Generate question embedding
    const queryVector = await googleGenAIService.embedText(question);

    // Search Qdrant for top similar chunks
    const similarChunks: ScoredChunk[] = await qdrantService.searchSimilarChunks(
      queryVector,
      documentId,
      4
    );

    // 11. Generate answer using Gemini grounded on the retrieved chunks
    const generation: GenerationResult = await googleGenAIService.generateGroundedAnswer(
      question,
      similarChunks
    );

    // Update document question count in history if documentId matches
    if (documentId && this.documentsHistory.has(documentId)) {
      const record = this.documentsHistory.get(documentId)!;
      record.questionsAsked += 1;
    }

    return {
      question,
      documentId,
      answer: generation.answer,
      citations: generation.citations,
      retrievedChunksCount: similarChunks.length,
    };
  }

  /**
   * Retrieves document history
   */
  getHistory(): DocumentHistoryRecord[] {
    return Array.from(this.documentsHistory.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }
}

export const docReaderService = new DocReaderService();
