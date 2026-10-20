import multer from 'multer';
import { BadRequestError } from '../errors/app-error.js';

// Use memory storage for fast processing and flexibility
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max file size for ebooks/textbooks
  },
  fileFilter: (_req, file, cb) => {
    // Allowed extensions/mimetypes for doc reader
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Only PDF and document files are supported'));
    }
  },
});
