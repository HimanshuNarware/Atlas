import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const poolConfig: PoolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl: env.PGSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: env.PGHOST,
      port: env.PGPORT,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      ssl: env.PGSSL ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  const start = Date.now();
  try {
    const res = await pool.query<R>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed database query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query failed', { text, error });
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connection established successfully', { now: res.rows[0]?.now });
    return true;
  } catch (error) {
    logger.warn('PostgreSQL connection failed. Database may not be running yet.', {
      error: error instanceof Error ? error.message : error,
    });
    return false;
  }
}

export async function closePool(): Promise<void> {
  logger.info('Closing PostgreSQL connection pool...');
  await pool.end();
  logger.info('PostgreSQL pool closed');
}
