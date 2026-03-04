/**
 * PostgreSQL client for auth (users, OTP, login history).
 */

import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

function getConnectionString(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === '') return null;
  return url.trim();
}

export function getPool(): Pool {
  if (!pool) {
    const conn = getConnectionString();
    if (!conn) {
      throw new Error('DATABASE_URL is not set. Add PostgreSQL connection string to .env');
    }

    pool = new Pool({
      connectionString: conn,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  return pool;
}

export function hasDatabase(): boolean {
  return !!getConnectionString();
}

export async function query<T = unknown>(text: string, values?: unknown[]): Promise<T[]> {
  const res = await getPool().query(text, values);
  return (res.rows || []) as T[];
}

export async function queryOne<T = unknown>(text: string, values?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

export async function run(text: string, values?: unknown[]): Promise<void> {
  await getPool().query(text, values);
}

export interface DbUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: string;
}

export interface DbOTP {
  email: string;
  otp: string;
  username: string;
  expires_at: Date;
}

export interface DbLoginHistory {
  id: number;
  user_id: string;
  username: string;
  email: string;
  role: string;
  login_at: Date;
  ip_address: string;
  user_agent: string;
}

const SCHEMA = `
-- Users (for login)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))
);

-- OTPs (for email OTP login)
CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  username TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Login history
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at DESC);
`;

export async function initSchema(client?: PoolClient): Promise<void> {
  const exec = client
    ? (t: string, v?: unknown[]) => client.query(t, v)
    : (t: string, v?: unknown[]) => getPool().query(t, v);
  await exec(SCHEMA);
}

export async function ensureSchema(): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await initSchema();
  } catch (e) {
    console.error('Failed to init PostgreSQL schema:', e);
    throw e;
  }
}
