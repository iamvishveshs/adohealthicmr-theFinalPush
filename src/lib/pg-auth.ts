/**
 * PostgreSQL-backed auth: users, OTP, login history.
 * Used for login (username/password), send OTP, verify OTP, and login history.
 */

import * as bcrypt from 'bcryptjs';
import { hasDatabase, query, queryOne, run, initSchema, type DbUser, type DbOTP, type DbLoginHistory } from './db';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

export interface LoginHistoryRecord {
  userId: string;
  username: string;
  email: string;
  role: string;
  loginAt: Date;
  ipAddress: string;
  userAgent: string;
}

export interface OTPRecord {
  otp: string;
  expiresAt: number;
  username: string;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function toUser(r: DbUser): UserRecord {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    passwordHash: r.password_hash,
    role: r.role === 'admin' ? 'admin' : 'user',
  };
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const DEFAULT_ADMIN_USERNAME = 'adohealthicmr';
export const DEFAULT_ADMIN_PASSWORD = 'Welcome@25';
export const DEFAULT_ADMIN_EMAIL = 'admin@adohealthicmr.com';

/** Default admin user object for use when DB is not configured (dev fallback). */
export function getDefaultAdminUser(): { id: string; username: string; email: string; role: 'admin' } {
  return { id: 'admin-1', username: DEFAULT_ADMIN_USERNAME, email: DEFAULT_ADMIN_EMAIL, role: 'admin' };
}

/** Check if username/password match the default admin (for no-DB fallback login). */
export function verifyDefaultAdminCredentials(username: string, password: string): boolean {
  return username.trim() === DEFAULT_ADMIN_USERNAME && password === DEFAULT_ADMIN_PASSWORD;
}

export async function ensureAuthSchema(): Promise<void> {
  if (!hasDatabase()) return;
  await initSchema();
  // Seed default admin if no users exist
  const count = await getUsersCount();
  if (count === 0) {
    await setDefaultAdmin();
  }
}

/** Ensure default admin exists with username adohealthicmr and password Welcome@25 (insert or reset password). */
export async function setDefaultAdmin(): Promise<void> {
  if (!hasDatabase()) throw new Error('DATABASE_URL is not set');
  await initSchema();
  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  await run(
    `INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, email = EXCLUDED.email, role = EXCLUDED.role`,
    ['admin-1', DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_EMAIL, passwordHash, 'admin']
  );
}

// --- Users ---
export async function getUserByUsername(username: string): Promise<UserRecord | undefined> {
  if (!hasDatabase()) return undefined;
  const row = await queryOne<DbUser>('SELECT * FROM users WHERE username = $1', [username.trim()]);
  return row ? toUser(row) : undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  if (!hasDatabase()) return undefined;
  const row = await queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
  return row ? toUser(row) : undefined;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  if (!hasDatabase()) return undefined;
  const key = email.trim().toLowerCase();
  const row = await queryOne<DbUser>('SELECT * FROM users WHERE LOWER(email) = $1', [key]);
  return row ? toUser(row) : undefined;
}

export async function verifyUserPasswordByEmail(email: string, password: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  if (!user) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

/** Create a user with email + password (username derived from email). For simple user signup. */
export async function createUserByEmail(email: string, password: string): Promise<UserRecord> {
  if (!hasDatabase()) throw new Error('Database not configured');
  await ensureAuthSchema();
  const key = email.trim().toLowerCase();
  const slug = key.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const id = slug ? 'user-' + slug : 'user-' + Date.now();

  // FIX: Ensure username is never null or empty to prevent DB 500 errors
  const username = key;

  return createUser({ id, username, email: key, password, role: 'user' });
}

export async function getAllUsers(opts?: { role?: 'user' | 'admin'; search?: string }): Promise<UserRecord[]> {
  if (!hasDatabase()) return [];
  let sql = 'SELECT * FROM users WHERE 1=1';
  const vals: unknown[] = [];
  let i = 1;
  if (opts?.role) {
    sql += ` AND role = $${i++}`;
    vals.push(opts.role);
  }
  if (opts?.search) {
    sql += ` AND (LOWER(username) LIKE $${i} OR LOWER(email) LIKE $${i})`;
    vals.push(`%${opts.search.toLowerCase()}%`);
  }
  sql += ' ORDER BY username';
  const rows = await query<DbUser>(sql, vals);
  return rows.map(toUser);
}

export async function createUser(data: Omit<UserRecord, 'passwordHash'> & { password: string }): Promise<UserRecord> {
  if (!hasDatabase()) throw new Error('Database not configured');
  await ensureAuthSchema();

  // Check if user already exists by username or email
  const existingByUsername = await getUserByUsername(data.username);
  if (existingByUsername) {
    throw new Error(`User with username "${data.username}" already exists`);
  }
  const existingByEmail = await getUserByEmail(data.email);
  if (existingByEmail) {
    throw new Error(`User with email "${data.email}" already exists`);
  }

  const passwordHash = bcrypt.hashSync(data.password, 10);
  try {
    // FIX: Optimized insert to return data directly
    await run(
      'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [data.id, data.username, data.email, passwordHash, data.role]
    );
  } catch (err: any) {
    // Handle PostgreSQL unique constraint violations
    if (err?.code === '23505') {
      const constraint = err?.constraint || '';
      if (constraint.includes('username')) {
        throw new Error(`User with username "${data.username}" already exists`);
      } else if (constraint.includes('email')) {
        throw new Error(`User with email "${data.email}" already exists`);
      } else {
        throw new Error('User already exists');
      }
    }
    // Re-throw other errors
    throw err;
  }
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    passwordHash,
    role: data.role,
  };
}

export async function verifyUserPassword(username: string, password: string): Promise<boolean> {
  const user = await getUserByUsername(username);
  if (!user) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

export async function updateUserById(
  id: string,
  updates: Partial<Pick<UserRecord, 'username' | 'email' | 'role'> & { password?: string }>
): Promise<UserRecord | null> {
  if (!hasDatabase()) return null;
  const user = await getUserById(id);
  if (!user) return null;
  let passwordHash = user.passwordHash;
  if (updates.password) {
    passwordHash = bcrypt.hashSync(updates.password, 10);
  }
  await run(
    'UPDATE users SET username = $1, email = $2, role = $3, password_hash = $4 WHERE id = $5',
    [updates.username ?? user.username, updates.email ?? user.email, updates.role ?? user.role, passwordHash, id]
  );
  return getUserById(id) ?? null;
}

export async function deleteUserById(id: string): Promise<boolean> {
  if (!hasDatabase()) return false;
  await run('DELETE FROM users WHERE id = $1', [id]);
  return true;
}

// --- OTP ---
export async function setOTP(email: string, username: string): Promise<string> {
  if (!hasDatabase()) throw new Error('Database not configured for OTP');
  await ensureAuthSchema();
  const otp = generateOTP();
  const key = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  await run(
    'INSERT INTO otps (email, otp, username, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET otp = $2, username = $3, expires_at = $4',
    [key, otp, username.trim(), expiresAt]
  );
  return otp;
}

export async function verifyAndConsumeOTP(email: string, otp: string): Promise<OTPRecord | null> {
  if (!hasDatabase()) return null;
  const key = email.toLowerCase().trim();
  const row = await queryOne<DbOTP>('SELECT * FROM otps WHERE email = $1', [key]);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await run('DELETE FROM otps WHERE email = $1', [key]);
    return null;
  }
  if (row.otp !== otp.trim()) return null;
  await run('DELETE FROM otps WHERE email = $1', [key]);
  return {
    otp: row.otp,
    expiresAt: new Date(row.expires_at).getTime(),
    username: row.username,
  };
}

// --- Login history ---
export async function addLoginHistory(record: LoginHistoryRecord): Promise<void> {
  if (!hasDatabase()) return;
  await ensureAuthSchema();
  await run(
    'INSERT INTO login_history (user_id, username, email, role, login_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [
      record.userId,
      record.username,
      record.email,
      record.role,
      record.loginAt,
      record.ipAddress || '',
      (record.userAgent || '').substring(0, 500),
    ]
  );
}

export async function getLoginHistory(limit = 100): Promise<LoginHistoryRecord[]> {
  if (!hasDatabase()) return [];
  const rows = await query<DbLoginHistory>(
    'SELECT * FROM login_history ORDER BY login_at DESC LIMIT $1',
    [Math.min(limit, 500)]
  );
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    email: r.email,
    role: r.role,
    loginAt: r.login_at,
    ipAddress: r.ip_address || '',
    userAgent: r.user_agent || '',
  }));
}

export async function getUsersCount(): Promise<number> {
  if (!hasDatabase()) return 0;
  try {
    const row = await queryOne<{ count: string }>('SELECT COUNT(*)::text AS count FROM users', []);
    return row ? parseInt(row.count, 10) : 0;
  } catch {
    return 0;
  }
}