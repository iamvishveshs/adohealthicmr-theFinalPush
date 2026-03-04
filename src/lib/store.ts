/**
 * PostgreSQL-backed data store.
 * Replaces the local JSON file system with full Neon DB integration.
 */

import { query, queryOne, run } from '@/lib/db';

// --- Types ---
export interface ModuleRecord {
  id: number;
  title: string;
  description: string;
  color: string;
}

export interface QuestionRecord {
  id: number;
  moduleId: number;
  question: string;
  options: string[];
  correctAnswer?: number;
}

export interface AnswerRecord {
  userId: string;
  moduleId: number;
  questionId: number;
  answer: string;
  isCorrect?: boolean;
  submittedAt: Date;
}

export interface VideoRecord {
  id?: number;
  moduleId: number;
  videoType: 'english' | 'punjabi' | 'hindi' | 'activity';
  videoId: number;
  preview: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  uploadedBy?: string;
  createdAt?: Date;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
}

export interface LoginHistoryRecord {
  id?: number;
  userId: string;
  username: string;
  email: string;
  role: string;
  loginAt: Date;
  ipAddress: string;
  userAgent: string;
}

// --- Modules ---
export async function getModules(): Promise<ModuleRecord[]> {
  const res = await query('SELECT id, title, description, color FROM modules ORDER BY id');
  return res.map((r: any) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    color: r.color
  }));
}

export async function getModuleById(id: number): Promise<ModuleRecord | undefined> {
  const row = await queryOne('SELECT id, title, description, color FROM modules WHERE id = $1', [id]);
  const r = row as any;
  return r ? { id: r.id, title: r.title, description: r.description, color: r.color } : undefined;
}

export async function createModule(data: ModuleRecord): Promise<ModuleRecord> {
  await run(
    `INSERT INTO modules (id, title, description, color) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, color = EXCLUDED.color`,
    [data.id, data.title, data.description, data.color]
  );
  return data;
}

export async function updateModule(id: number, updates: Partial<Omit<ModuleRecord, 'id'>>): Promise<ModuleRecord | null> {
  await run(
    `UPDATE modules SET title = COALESCE($1,title), description = COALESCE($2,description), color = COALESCE($3,color) WHERE id = $4`,
    [updates.title ?? null, updates.description ?? null, updates.color ?? null, id]
  );
  const updated = await getModuleById(id);
  return updated ?? null;
}

export async function deleteModule(id: number): Promise<boolean> {
  await run('DELETE FROM modules WHERE id = $1', [id]);
  return true;
}

// --- Questions ---
function mapQuestionRow(row: any): QuestionRecord {
  let parsedOptions = row.options;
  if (typeof row.options === 'string') {
    try {
      parsedOptions = JSON.parse(row.options);
    } catch (e) {
      parsedOptions = [];
    }
  }
  return {
    id: row.id,
    moduleId: row.module_id,
    question: row.question,
    options: Array.isArray(parsedOptions) ? parsedOptions : [],
    correctAnswer: row.correct_answer,
  };
}

export async function getQuestions(moduleId?: number): Promise<QuestionRecord[]> {
  let sql = 'SELECT * FROM questions';
  const params: any[] = [];
  if (moduleId !== undefined) {
    sql += ' WHERE module_id = $1';
    params.push(moduleId);
  }
  sql += ' ORDER BY module_id, id ASC';
  const rows = await query(sql, params);
  return rows.map(mapQuestionRow);
}

export async function getQuestionById(id: number, moduleId: number): Promise<QuestionRecord | undefined> {
  const row = await queryOne('SELECT * FROM questions WHERE id = $1 AND module_id = $2', [id, moduleId]);
  return row ? mapQuestionRow(row) : undefined;
}

export async function createQuestion(data: QuestionRecord): Promise<QuestionRecord> {
  const optionsJson = JSON.stringify(data.options || []);
  await run(
    'INSERT INTO questions (id, module_id, question, options, correct_answer) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id, module_id) DO UPDATE SET question = EXCLUDED.question, options = EXCLUDED.options, correct_answer = EXCLUDED.correct_answer',
    [data.id, data.moduleId, data.question || '', optionsJson, data.correctAnswer ?? null]
  );
  const created = await getQuestionById(data.id, data.moduleId);
  if (!created) throw new Error('Failed to retrieve created question');
  return created;
}

export async function updateQuestion(id: number, moduleId: number, updates: Partial<Omit<QuestionRecord, 'id' | 'moduleId'>>): Promise<QuestionRecord | null> {
  const existing = await getQuestionById(id, moduleId);
  if (!existing) return null;

  const question = updates.question !== undefined ? updates.question : existing.question;
  const options = updates.options !== undefined ? JSON.stringify(updates.options) : JSON.stringify(existing.options);
  const correctAnswer = updates.correctAnswer !== undefined ? updates.correctAnswer : existing.correctAnswer;

  await run(
    'UPDATE questions SET question = $1, options = $2, correct_answer = $3 WHERE id = $4 AND module_id = $5',
    [question, options, correctAnswer, id, moduleId]
  );
  const updated = await getQuestionById(id, moduleId);
  return updated ?? null;
}

export async function deleteQuestion(id: number, moduleId: number): Promise<boolean> {
  await run('DELETE FROM questions WHERE id = $1 AND module_id = $2', [id, moduleId]);
  return true;
}

// --- Videos ---
function mapVideoRow(row: any): VideoRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    videoType: row.video_type,
    videoId: Number(row.video_id),
    preview: row.preview,
    fileName: row.file_name,
    fileSize: Number(row.file_size),
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export async function getVideos(moduleId?: number, videoType?: string): Promise<VideoRecord[]> {
  let sql = 'SELECT * FROM videos WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (moduleId !== undefined) {
    sql += ` AND module_id = $${paramCount}`;
    params.push(moduleId);
    paramCount++;
  }
  if (videoType !== undefined) {
    sql += ` AND video_type = $${paramCount}`;
    params.push(videoType);
  }

  sql += ' ORDER BY created_at DESC';
  const rows = await query(sql, params);
  return rows.map(mapVideoRow);
}

export async function getVideoById(moduleId: number, videoType: string, videoId: number): Promise<VideoRecord | undefined> {
  const row = await queryOne(
    'SELECT * FROM videos WHERE module_id = $1 AND video_type = $2 AND video_id = $3',
    [moduleId, videoType, videoId]
  );
  return row ? mapVideoRow(row) : undefined;
}

export async function createVideo(data: VideoRecord): Promise<VideoRecord> {
  await run(
    `INSERT INTO videos (module_id, video_type, video_id, preview, file_name, file_size, file_url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (module_id, video_type, video_id)
     DO UPDATE SET preview = EXCLUDED.preview, file_name = EXCLUDED.file_name, file_size = EXCLUDED.file_size, file_url = EXCLUDED.file_url`,
    [data.moduleId, data.videoType, data.videoId, data.preview, data.fileName, data.fileSize, data.fileUrl, data.uploadedBy]
  );
  const created = await getVideoById(data.moduleId, data.videoType, data.videoId);
  if (!created) throw new Error('Failed to retrieve created video');
  return created;
}

export async function updateVideo(
  moduleId: number,
  videoType: string,
  videoId: number,
  updates: Partial<Pick<VideoRecord, 'preview' | 'fileName' | 'fileSize' | 'fileUrl'>>
): Promise<VideoRecord | null> {
  await run(
    `UPDATE videos SET
     preview = COALESCE($1, preview),
     file_name = COALESCE($2, file_name),
     file_size = COALESCE($3, file_size),
     file_url = COALESCE($4, file_url)
     WHERE module_id = $5 AND video_type = $6 AND video_id = $7`,
    [updates.preview ?? null, updates.fileName ?? null, updates.fileSize ?? null, updates.fileUrl ?? null, moduleId, videoType, videoId]
  );
  const updated = await getVideoById(moduleId, videoType, videoId);
  return updated ?? null;
}

export async function deleteVideo(moduleId: number, videoType: string, videoId: number): Promise<boolean> {
  await run('DELETE FROM videos WHERE module_id = $1 AND video_type = $2 AND video_id = $3', [moduleId, videoType, videoId]);
  return true;
}

// --- Answers ---
export async function getAnswers(userId: string, moduleId?: number): Promise<AnswerRecord[]> {
  let sql = 'SELECT * FROM answers WHERE user_id = $1';
  const params: any[] = [userId];
  if (moduleId !== undefined) {
    sql += ' AND module_id = $2';
    params.push(moduleId);
  }
  const rows = await query(sql, params);
  return rows.map((r: any) => ({
    userId: r.user_id,
    moduleId: r.module_id,
    questionId: r.question_id,
    answer: r.answer,
    isCorrect: Boolean(r.is_correct),
    submittedAt: new Date(r.submitted_at),
  }));
}

export async function getAllAnswers(moduleId?: number): Promise<AnswerRecord[]> {
  let sql = 'SELECT * FROM answers';
  const params: any[] = [];
  if (moduleId !== undefined) {
    sql += ' WHERE module_id = $1';
    params.push(moduleId);
  }
  const rows = await query(sql, params);
  return rows.map((r: any) => ({
    userId: r.user_id,
    moduleId: r.module_id,
    questionId: r.question_id,
    answer: r.answer,
    isCorrect: Boolean(r.is_correct),
    submittedAt: new Date(r.submitted_at),
  }));
}

export async function upsertAnswer(data: { userId: string; moduleId: number; questionId: number; answer: string; isCorrect?: boolean }): Promise<AnswerRecord> {
  const isCorrectInt = data.isCorrect ? 1 : 0; // Convert boolean to integer for Postgres

  await run(
    `INSERT INTO answers (user_id, module_id, question_id, answer, is_correct)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, module_id, question_id)
     DO UPDATE SET answer = EXCLUDED.answer, is_correct = EXCLUDED.is_correct, submitted_at = CURRENT_TIMESTAMP`,
    [data.userId, data.moduleId, data.questionId, data.answer, isCorrectInt]
  );
  return { ...data, submittedAt: new Date() };
}


// 2. NEW: Bulk Insert function for maximum performance
export async function upsertAnswers(dataList: { userId: string; moduleId: number; questionId: number; answer: string; isCorrect?: boolean }[]): Promise<AnswerRecord[]> {
  if (!dataList || dataList.length === 0) return [];

  const values: any[] = [];
  const placeholders: string[] = [];
  let i = 1;

  dataList.forEach((data) => {
    const isCorrectInt = data.isCorrect ? 1 : 0; // Convert boolean to integer
    placeholders.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    values.push(data.userId, data.moduleId, data.questionId, data.answer, isCorrectInt);
  });

  // Single query execution for all answers
  const sql = `
    INSERT INTO answers (user_id, module_id, question_id, answer, is_correct)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (user_id, module_id, question_id)
    DO UPDATE SET
      answer = EXCLUDED.answer,
      is_correct = EXCLUDED.is_correct,
      submitted_at = CURRENT_TIMESTAMP
  `;

  await run(sql, values);

  return dataList.map(data => ({ ...data, submittedAt: new Date() }));
}

// --- Users & Login History ---
export async function getUserByUsername(username: string): Promise<UserRecord | undefined> {
  const row = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
  const r = row as any;
  return r ? { id: r.id, username: r.username, email: r.email, passwordHash: r.password_hash, role: r.role as 'user' | 'admin' } : undefined;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const row = await queryOne('SELECT * FROM users WHERE id = $1', [id]);
  const r = row as any;
  return r ? { id: r.id, username: r.username, email: r.email, passwordHash: r.password_hash, role: r.role as 'user' | 'admin' } : undefined;
}

export async function getAllUsers(opts?: { role?: 'user' | 'admin'; search?: string }): Promise<UserRecord[]> {
  let sql = 'SELECT * FROM users WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (opts?.role) {
    sql += ` AND role = $${paramCount}`;
    params.push(opts.role);
    paramCount++;
  }
  if (opts?.search) {
    sql += ` AND (LOWER(username) LIKE $${paramCount} OR LOWER(email) LIKE $${paramCount})`;
    params.push(`%${opts.search.toLowerCase()}%`);
  }
  const rows = await query(sql, params);
  return rows.map((row: any) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as 'user' | 'admin'
  }));
}

export async function createUser(data: Omit<UserRecord, 'passwordHash'> & { password: string }): Promise<UserRecord> {
  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync(data.password, 10);
  await run(
    'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
    [data.id, data.username, data.email, passwordHash, data.role]
  );
  return { id: data.id, username: data.username, email: data.email, passwordHash, role: data.role };
}

export async function updateUserById(
  id: string,
  updates: Partial<Pick<UserRecord, 'username' | 'email' | 'role'> & { password?: string }>
): Promise<UserRecord | null> {
  const user = await getUserById(id);
  if (!user) return null;

  let newHash = user.passwordHash;
  if (updates.password) {
    const bcrypt = require('bcryptjs');
    newHash = bcrypt.hashSync(updates.password, 10);
  }

  await run(
    'UPDATE users SET username = COALESCE($1,username), email = COALESCE($2,email), role = COALESCE($3,role), password_hash = $4 WHERE id = $5',
    [updates.username ?? null, updates.email ?? null, updates.role ?? null, newHash, id]
  );
  const updated = await getUserById(id);
  return updated ?? null;
}

export async function deleteUserById(id: string): Promise<boolean> {
  await run('DELETE FROM users WHERE id = $1', [id]);
  return true;
}

export async function addLoginHistory(record: LoginHistoryRecord): Promise<void> {
  await run(
    'INSERT INTO login_history (user_id, username, email, role, login_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [record.userId, record.username, record.email, record.role, record.loginAt, record.ipAddress, record.userAgent]
  );
}

export async function getLoginHistory(limit = 100): Promise<LoginHistoryRecord[]> {
  const rows = await query('SELECT * FROM login_history ORDER BY login_at DESC LIMIT $1', [limit]);
  return rows.map((r: any) => ({
    id: r.id, userId: r.user_id, username: r.username, email: r.email, role: r.role,
    loginAt: new Date(r.login_at), ipAddress: r.ip_address, userAgent: r.user_agent
  }));
}

// --- Health Status ---
export async function getStoreStatus(): Promise<{ modules: number; questions: number; users: number }> {
  try {
    const modCount = await queryOne('SELECT COUNT(*) as count FROM modules', []) as any;
    const qCount = await queryOne('SELECT COUNT(*) as count FROM questions', []) as any;
    const uCount = await queryOne('SELECT COUNT(*) as count FROM users', []) as any;
    return {
      modules: parseInt(modCount?.count || '0', 10),
      questions: parseInt(qCount?.count || '0', 10),
      users: parseInt(uCount?.count || '0', 10)
    };
  } catch (e) {
    return { modules: 0, questions: 0, users: 0 };
  }
}

// Ensure old synchronous functions aren't exported
export function replaceModulesAndQuestions() {
  throw new Error("replaceModulesAndQuestions is deprecated. Update Postgres directly.");
}