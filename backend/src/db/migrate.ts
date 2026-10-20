import { query, pool } from '../config/database.js';
import { logger } from '../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await query(sql);
    logger.info('Database migrations applied successfully');
  } catch (error) {
    logger.error('Database migration failed', error);
    throw error;
  }
}

// When executed directly via command line
if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
