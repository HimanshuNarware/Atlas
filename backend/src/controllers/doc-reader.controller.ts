import { Request, Response, NextFunction } from 'express';
import { docReaderService } from '../services/doc-reader.service.js';
import { sendSuccess } from '../utils/response.js';
import { BadRequestError } from '../errors/app-error.js';

export class DocReaderController {
  /**
   * Handles PDF upload, text extraction, chunking, embeddings, and Qdrant vector storage.
   * Supports asking an initial question simultaneously while uploading.
   */
  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('No PDF file provided. Please upload a PDF under the form-data field "file".');
      }

      const initialQuestion = req.body?.question as string | undefined;

      const result = await docReaderService.processPdfUpload({
        fileBuffer: file.buffer,
        filename: file.originalname,
        question: initialQuestion,
      });

      const message = result.answer
        ? 'Document uploaded, indexed, and initial question answered successfully.'
        : 'Document uploaded and indexed successfully into vector store.';

      sendSuccess(res, result, message, 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handles question answering against indexed documents via Qdrant cosine search & Gemini
   */
  ans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, documentId } = req.body;
      if (!question) {
        throw new BadRequestError('A question string is required in the request body.');
      }

      const result = await docReaderService.answerQuestion(question, documentId);
      sendSuccess(res, result, 'Question answered successfully with verified citations.', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns list of indexed documents and their question count
   */
  history = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = docReaderService.getHistory();
      sendSuccess(res, history, 'Document history retrieved successfully.', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const docReaderController = new DocReaderController();
