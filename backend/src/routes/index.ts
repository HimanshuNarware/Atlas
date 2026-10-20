import { Router } from 'express';
import { userRouter } from './user.router.js';
import { docReaderRouter } from './doc-reader.router.js';

export const apiRouter = Router();

apiRouter.use('/users', userRouter);
apiRouter.use('/doc-reader', docReaderRouter);

export { userRouter, docReaderRouter };
