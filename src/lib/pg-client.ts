import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION || '';

let pool: Pool | null = null;

function getPoolInternal(): Pool {
  if (!pool) {
    if (!connectionString || connectionString.trim() === '') {
      throw new Error(
        'DATABASE_URL (or PG_CONNECTION) is not set. Add a PostgreSQL connection string to .env.local to use the database, or leave it unset to use file-based storage.'
      );
    }
    pool = new Pool({ connectionString: connectionString.trim() });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  return getPoolInternal().query(text, params);
}

export function getPool(): Pool {
  return getPoolInternal();
}

export async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
