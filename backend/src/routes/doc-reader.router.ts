import { Router } from 'express';
import { docReaderController } from '../controllers/doc-reader.controller.js';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { askQuestionSchema } from '../validators/doc-reader.validator.js';

export const docReaderRouter = Router();

/**
 * @route   POST /doc-reader/upload (or /upload)
 * @desc    Upload document file (placeholder endpoint)
 * @access  Public / Authenticated
 */
docReaderRouter.post('/upload', uploadMiddleware.single('file'), docReaderController.upload);

/**
 * @route   POST /doc-reader/ans (or /ans)
 * @desc    Submit question to document and retrieve answer (placeholder endpoint)
 * @access  Public / Authenticated
 */
docReaderRouter.post('/ans', validateBody(askQuestionSchema), docReaderController.ans);

/**
 * @route   GET /doc-reader/history (or /history)
 * @desc    Retrieve document question/answer history (placeholder endpoint)
 * @access  Public / Authenticated
 */
docReaderRouter.get('/history', docReaderController.history);
