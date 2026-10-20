import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().default('localhost'),
  PGPORT: z.string().default('5432').transform((val) => parseInt(val, 10)),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default('postgres'),
  PGDATABASE: z.string().default('docreader_db'),
  PGSSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters').default('super-secret-jwt-key-replace-in-production-minimum-32-chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_SECRET_KEY: z.string().default('admin-super-secret-key-12345'),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  // Google Gemini API Key
  GEMINI_API_KEY: z.string().default(''),
  // Qdrant Vector Database
  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default('docreader_documents'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
