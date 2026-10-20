import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().trim().min(1, 'Question must not be empty').max(2000),
  documentId: z.string().optional(),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

export const uploadBodySchema = z.object({
  question: z.string().trim().max(2000).optional(),
});

export type UploadBodyInput = z.infer<typeof uploadBodySchema>;
