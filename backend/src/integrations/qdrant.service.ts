import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { DocumentChunk } from '../utils/chunker.js';

export interface ScoredChunk {
  chunkId: string;
  text: string;
  length: number;
  pageNumber: number;
  score: number;
  documentId: string;
  filename: string;
}

export class QdrantService {
  private client: QdrantClient;
  private collectionName: string;
  private isInitialized = false;

  constructor() {
    this.collectionName = env.QDRANT_COLLECTION;
    this.client = new QdrantClient({
      url: env.QDRANT_URL,
      apiKey: env.QDRANT_API_KEY || undefined,
      checkCompatibility: false,
    });
  }

  /**
   * Automatically initializes the Qdrant collection with 1536-dim vectors & cosine metric
   */
  async ensureCollection(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const exists = await this.client.collectionExists(this.collectionName);
      if (!exists) {
        logger.info(`Creating Qdrant collection: "${this.collectionName}" (Cosine, 1536 dimensions)...`);
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'documentId',
          field_schema: 'keyword',
          wait: true,
        });

        logger.info(`Qdrant collection "${this.collectionName}" created with documentId payload index.`);
      } else {
        // Ensure index exists on documentId for strict mode clusters
        try {
          await this.client.createPayloadIndex(this.collectionName, {
            field_name: 'documentId',
            field_schema: 'keyword',
            wait: true,
          });
        } catch {
          // Index already exists, ignore
        }
      }
      this.isInitialized = true;
    } catch (error) {
      logger.warn(
        `Failed to verify or connect to Qdrant at ${env.QDRANT_URL}. Ensure Qdrant Cloud or local instance is accessible.`,
        { error: error instanceof Error ? error.message : String(error) }
      );
      throw error;
    }
  }

  /**
   * Stores vector embeddings, text, and metadata in Qdrant
   */
  async upsertChunks(
    chunks: DocumentChunk[],
    embeddings: number[][]
  ): Promise<void> {
    await this.ensureCollection();

    if (chunks.length === 0) return;

    const points = chunks.map((chunk, index) => {
      const vector = embeddings[index];
      if (!vector) {
        throw new Error(`Missing vector embedding for chunk index ${index}`);
      }

      return {
        id: chunk.id,
        vector,
        payload: {
          documentId: chunk.documentId,
          text: chunk.text,
          length: chunk.length,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          filename: chunk.filename,
        },
      };
    });

    // Batch upsert (max 100 points per batch)
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: batch,
      });
    }

    logger.info(`Successfully stored ${points.length} vector embeddings in Qdrant collection "${this.collectionName}".`);
  }

  /**
   * Performs cosine similarity vector search in Qdrant, optionally scoped to a document
   */
  async searchSimilarChunks(
    queryVector: number[],
    documentId?: string,
    limit = 4
  ): Promise<ScoredChunk[]> {
    await this.ensureCollection();

    const filter = documentId
      ? {
          must: [
            {
              key: 'documentId',
              match: {
                value: documentId,
              },
            },
          ],
        }
      : undefined;

    const queryResponse = await this.client.query(this.collectionName, {
      query: queryVector,
      filter,
      limit,
      with_payload: true,
    });

    const points = queryResponse.points || [];

    return points.map((p) => {
      const payload = (p.payload || {}) as Record<string, unknown>;
      return {
        chunkId: String(p.id),
        score: p.score ?? 0,
        text: String(payload['text'] || ''),
        length: Number(payload['length'] || 0),
        pageNumber: Number(payload['pageNumber'] || 1),
        documentId: String(payload['documentId'] || ''),
        filename: String(payload['filename'] || ''),
      };
    });
  }
}

export const qdrantService = new QdrantService();
