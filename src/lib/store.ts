/**
 * In-memory data store.
 * Modules & questions loaded from data/app-data.json; others in memory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { query } from '@/lib/pg-client';

const DATA_FILE = path.join(process.cwd(), 'data', 'app-data.json');
const ANSWERS_FILE = path.join(process.cwd(), 'data', 'answers.json');
const VIDEOS_FILE = path.join(process.cwd(), 'data', 'videos.json');
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

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
  moduleId: number;
  videoType: 'english' | 'punjabi' | 'hindi' | 'activity';
  videoId: number;
  preview: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string;
  uploadedBy?: string;
}

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

// --- In-memory stores (used when Postgres not configured) ---
let modules: ModuleRecord[] = [];
let questionsByModule: Record<string, QuestionRecord[]> = {};
const answersStore: AnswerRecord[] = [];
const videosStore: VideoRecord[] = [];
const usersStore = new Map<string, UserRecord>();
const loginHistoryStore: LoginHistoryRecord[] = [];

let dataLoaded = false;
const USE_PG = !!process.env.DATABASE_URL;

function loadData() {
  if (dataLoaded || USE_PG) return;
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    modules = Array.isArray(data.modules) ? data.modules : [];
    const q = data.questions;
    if (q && typeof q === 'object') {
      questionsByModule = q;
    }
    // Attempt to load persisted videos
    try {
      const videosRaw = fs.readFileSync(VIDEOS_FILE, 'utf8');
      const videosArr = JSON.parse(videosRaw);
      if (Array.isArray(videosArr)) {
        videosStore.length = 0;
        for (const v of videosArr) {
          // Skip videos with base64 data URLs - they should not be persisted
          // Only load videos with valid Cloudinary URLs or empty preview/fileUrl
          const hasBase64Preview = v.preview && (v.preview.startsWith('data:') || v.preview.startsWith('blob:'));
          const hasBase64FileUrl = v.fileUrl && (v.fileUrl.startsWith('data:') || v.fileUrl.startsWith('blob:'));
          
          if (hasBase64Preview || hasBase64FileUrl) {
            console.warn(`Skipping video with base64 data (moduleId: ${v.moduleId}, videoType: ${v.videoType}, videoId: ${v.videoId}). Please re-upload to Cloudinary.`);
            continue;
          }
          
          videosStore.push({
            moduleId: v.moduleId,
            videoType: v.videoType,
            videoId: v.videoId,
            preview: v.preview,
            fileName: v.fileName,
            fileSize: v.fileSize,
            fileUrl: v.fileUrl,
            uploadedBy: v.uploadedBy,
          });
        }
      }
    } catch (e) {
      // No videos file yet or invalid - leave store as is
    }

    // Attempt to load persisted users
    try {
      const usersRaw = fs.readFileSync(USERS_FILE, 'utf8');
      const usersArr = JSON.parse(usersRaw);
      if (Array.isArray(usersArr)) {
        usersStore.clear();
        for (const u of usersArr) {
          // Expect stored shape: { id, username, email, passwordHash, role }
          if (u && u.username) {
            usersStore.set(u.username, {
              id: u.id,
              username: u.username,
              email: u.email,
              passwordHash: u.passwordHash,
              role: u.role,
            });
          }
        }
      }
    } catch (e) {
      // No users file yet or invalid - leave store as is
    }
    // Load persisted answers
    try {
      const answersRaw = fs.readFileSync(ANSWERS_FILE, 'utf8');
      const answersArr = JSON.parse(answersRaw);
      if (Array.isArray(answersArr)) {
        answersStore.length = 0;
        for (const a of answersArr) {
          answersStore.push({
            userId: a.userId,
            moduleId: a.moduleId,
            questionId: a.questionId,
            answer: a.answer,
            isCorrect: a.isCorrect,
            submittedAt: new Date(a.submittedAt),
          });
        }
      }
    } catch (e) {
      // No answers file yet or invalid - leave store as is
    }
  } catch (e) {
    console.warn('Store: could not load app-data.json', e);
    modules = [];
    questionsByModule = {};
    // In case of missing app-data.json we'll still ensure a default admin later
  }
  // Ensure default admin exists (password: Welcome@25) - bcrypt hash
  try {
    const bcrypt = require('bcryptjs');
    const defaultHash = bcrypt.hashSync('Welcome@25', 10);
    if (!usersStore.has('adohealthicmr')) {
      usersStore.set('adohealthicmr', {
        id: 'admin-1',
        username: 'adohealthicmr',
        email: 'admin@adohealthicmr.com',
        passwordHash: defaultHash,
        role: 'admin',
      });
    }
  } catch (e) {
    // ignore bcrypt errors
  }

  dataLoaded = true;
}

// --- Modules ---
export async function getModules(): Promise<ModuleRecord[]> {
  if (USE_PG) {
    const res = await query('SELECT id, title, description, color FROM modules ORDER BY id');
    return res.rows.map((r: any) => ({ id: r.id, title: r.title, description: r.description, color: r.color }));
  }
  loadData();
  return [...modules].sort((a, b) => a.id - b.id);
}

export async function getModuleById(id: number): Promise<ModuleRecord | undefined> {
  if (USE_PG) {
    const res = await query('SELECT id, title, description, color FROM modules WHERE id = $1', [id]);
    const row = res.rows[0];
    return row ? { id: row.id, title: row.title, description: row.description, color: row.color } : undefined;
  }
  loadData();
  return modules.find((m) => m.id === id);
}

export async function createModule(data: ModuleRecord): Promise<ModuleRecord> {
  if (USE_PG) {
    await query(
      `INSERT INTO modules (id, title, description, color) VALUES ($1,$2,$3,$4)`,
      [data.id, data.title, data.description, data.color]
    );
    return data;
  }
  loadData();
  if (modules.some((m) => m.id === data.id)) throw new Error(`Module with ID ${data.id} already exists`);
  modules.push({ ...data });
  persistData();
  return data;
}

export async function updateModule(id: number, updates: Partial<Omit<ModuleRecord, 'id'>>): Promise<ModuleRecord | null> {
  if (USE_PG) {
    const res = await query(
      `UPDATE modules SET title = COALESCE($1,title), description = COALESCE($2,description), color = COALESCE($3,color) WHERE id = $4 RETURNING id, title, description, color`,
      [updates.title ?? null, updates.description ?? null, updates.color ?? null, id]
    );
    const row = res.rows[0];
    return row ? { id: row.id, title: row.title, description: row.description, color: row.color } : null;
  }
  loadData();
  const i = modules.findIndex((m) => m.id === id);
  if (i === -1) return null;
  modules[i] = { ...modules[i], ...updates };
  persistData();
  return modules[i];
}

export async function deleteModule(id: number): Promise<boolean> {
  if (USE_PG) {
    const res = await query('DELETE FROM modules WHERE id = $1', [id]);
    return res.rowCount > 0;
  }
  loadData();
  const i = modules.findIndex((m) => m.id === id);
  if (i === -1) return false;
  modules.splice(i, 1);
  persistData();
  return true;
}

// --- Questions ---
export async function getQuestions(moduleId?: number): Promise<QuestionRecord[]> {
  if (USE_PG) {
    const params: any[] = [];
    let sql = 'SELECT id, module_id, question, options, correct_answer FROM questions';
    if (moduleId != null) {
      sql += ' WHERE module_id = $1';
      params.push(moduleId);
    }
    sql += ' ORDER BY module_id, id';
    const res = await query(sql, params);
    return res.rows.map((r: any) => ({ id: r.id, moduleId: r.module_id, question: r.question, options: r.options || [], correctAnswer: r.correct_answer }));
  }
  loadData();
  if (moduleId != null) {
    const list = questionsByModule[String(moduleId)] || [];
    return list.map((q) => ({ ...q, moduleId }));
  }
  const all: QuestionRecord[] = [];
  for (const [modId, list] of Object.entries(questionsByModule)) {
    for (const q of list) {
      all.push({ ...q, moduleId: parseInt(modId, 10) });
    }
  }
  return all.sort((a, b) => a.moduleId - b.moduleId || a.id - b.id);
}

export async function getQuestionById(id: number, moduleId: number): Promise<QuestionRecord | undefined> {
  if (USE_PG) {
    const res = await query('SELECT id, module_id, question, options, correct_answer FROM questions WHERE id = $1 AND module_id = $2', [id, moduleId]);
    const row = res.rows[0];
    if (!row) return undefined;
    return { id: row.id, moduleId: row.module_id, question: row.question, options: row.options || [], correctAnswer: row.correct_answer };
  }
  loadData();
  const list = questionsByModule[String(moduleId)] || [];
  const q = list.find((x) => x.id === id);
  return q ? { ...q, moduleId } : undefined;
}

export async function createQuestion(data: QuestionRecord): Promise<QuestionRecord> {
  if (USE_PG) {
    await query(
      'INSERT INTO questions (id, module_id, question, options, correct_answer) VALUES ($1,$2,$3,$4,$5)',
      [data.id, data.moduleId, data.question || '', JSON.stringify(data.options || []), data.correctAnswer ?? null]
    );
    return data;
  }
  loadData();
  const key = String(data.moduleId);
  if (!questionsByModule[key]) questionsByModule[key] = [];
  if (questionsByModule[key].some((q) => q.id === data.id)) throw new Error(`Question with ID ${data.id} already exists`);
  questionsByModule[key].push({ ...data });
  persistData();
  return data;
}

export async function updateQuestion(id: number, moduleId: number, updates: Partial<Omit<QuestionRecord, 'id' | 'moduleId'>>): Promise<QuestionRecord | null> {
  if (USE_PG) {
    const res = await query(
      'UPDATE questions SET question = COALESCE($1,question), options = COALESCE($2,options), correct_answer = COALESCE($3,correct_answer) WHERE id = $4 AND module_id = $5 RETURNING id, module_id, question, options, correct_answer',
      [updates.question ?? null, updates.options ? JSON.stringify(updates.options) : null, updates.correctAnswer !== undefined ? updates.correctAnswer : null, id, moduleId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return { id: row.id, moduleId: row.module_id, question: row.question, options: row.options || [], correctAnswer: row.correct_answer };
  }
  loadData();
  const list = questionsByModule[String(moduleId)] || [];
  const i = list.findIndex((q) => q.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...updates };
  persistData();
  return list[i];
}

export async function deleteQuestion(id: number, moduleId: number): Promise<boolean> {
  if (USE_PG) {
    const res = await query('DELETE FROM questions WHERE id = $1 AND module_id = $2', [id, moduleId]);
    return res.rowCount > 0;
  }
  loadData();
  const list = questionsByModule[String(moduleId)] || [];
  const i = list.findIndex((q) => q.id === id);
  if (i === -1) return false;
  list.splice(i, 1);
  persistData();
  return true;
}

// --- Answers ---
export function getAnswers(userId: string, moduleId?: number): AnswerRecord[] {
  loadData();
  let list = answersStore.filter((a) => a.userId === userId);
  if (moduleId != null) list = list.filter((a) => a.moduleId === moduleId);
  return list;
}

/** All answers (for admin statistics). */
export function getAllAnswers(moduleId?: number): AnswerRecord[] {
  loadData();
  let list = [...answersStore];
  if (moduleId != null) list = list.filter((a) => a.moduleId === moduleId);
  return list;
}

function persistAnswers(): void {
  try {
    const dir = path.dirname(ANSWERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const out = answersStore.map((a) => ({
      userId: a.userId,
      moduleId: a.moduleId,
      questionId: a.questionId,
      answer: a.answer,
      isCorrect: a.isCorrect,
      submittedAt: a.submittedAt.toISOString(),
    }));
    fs.writeFileSync(ANSWERS_FILE, JSON.stringify(out, null, 2), 'utf8');
  } catch (e) {
    console.warn('Store: could not persist answers.json', e);
  }
}

function persistVideos(): void {
  try {
    const dir = path.dirname(VIDEOS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const out = videosStore.map((v) => ({
      moduleId: v.moduleId,
      videoType: v.videoType,
      videoId: v.videoId,
      preview: v.preview,
      fileName: v.fileName,
      fileSize: v.fileSize,
      fileUrl: v.fileUrl,
      uploadedBy: v.uploadedBy,
    }));
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(out, null, 2), 'utf8');
  } catch (e) {
    console.warn('Store: could not persist videos.json', e);
  }
}

function persistUsers(): void {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const out = Array.from(usersStore.values()).map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
    }));
    fs.writeFileSync(USERS_FILE, JSON.stringify(out, null, 2), 'utf8');
  } catch (e) {
    console.warn('Store: could not persist users.json', e);
  }
}

export function upsertAnswer(data: { userId: string; moduleId: number; questionId: number; answer: string; isCorrect?: boolean }): AnswerRecord {
  loadData();
  const existing = answersStore.findIndex(
    (a) => a.userId === data.userId && a.moduleId === data.moduleId && a.questionId === data.questionId
  );
  const record: AnswerRecord = {
    ...data,
    submittedAt: new Date(),
  };
  if (existing >= 0) {
    answersStore[existing] = record;
  } else {
    answersStore.push(record);
  }
  persistAnswers();
  return record;
}

// --- Videos ---
export function getVideos(moduleId?: number, videoType?: string): VideoRecord[] {
  loadData();
  let list = [...videosStore];
  if (moduleId != null) list = list.filter((v) => v.moduleId === moduleId);
  if (videoType) list = list.filter((v) => v.videoType === videoType);
  return list;
}

/**
 * Validates that preview and fileUrl are not base64 data URLs
 * Base64 data URLs should never be stored in videos.json - only Cloudinary URLs
 */
function validateVideoData(data: VideoRecord): void {
  // Check if preview contains base64 data
  if (data.preview && data.preview.startsWith('data:')) {
    throw new Error('Preview cannot contain base64 data. Use Cloudinary thumbnail URL instead.');
  }
  
  // Check if fileUrl contains base64 data
  if (data.fileUrl && data.fileUrl.startsWith('data:')) {
    throw new Error('fileUrl cannot contain base64 data. Use Cloudinary secure_url instead.');
  }
  
  // Check if preview is a blob URL (shouldn't be persisted)
  if (data.preview && data.preview.startsWith('blob:')) {
    throw new Error('Preview cannot contain blob URL. Use Cloudinary thumbnail URL instead.');
  }
  
  // Check if fileUrl is a blob URL (shouldn't be persisted)
  if (data.fileUrl && data.fileUrl.startsWith('blob:')) {
    throw new Error('fileUrl cannot contain blob URL. Use Cloudinary secure_url instead.');
  }
}

export function createVideo(data: VideoRecord): VideoRecord {
  loadData();
  validateVideoData(data);
  videosStore.push({ ...data });
  persistVideos();
  return data;
}

export function updateVideo(
  moduleId: number,
  videoType: string,
  videoId: number,
  updates: Partial<Pick<VideoRecord, 'preview' | 'fileName' | 'fileSize' | 'fileUrl'>>
): VideoRecord | null {
  loadData();
  const i = videosStore.findIndex((v) => v.moduleId === moduleId && v.videoType === videoType && v.videoId === videoId);
  if (i === -1) return null;
  
  // Validate updates before applying
  const updatedVideo = { ...videosStore[i], ...updates };
  validateVideoData(updatedVideo);
  
  videosStore[i] = updatedVideo;
  persistVideos();
  return videosStore[i];
}

export function deleteVideo(moduleId: number, videoType: string, videoId: number): boolean {
  loadData();
  const i = videosStore.findIndex((v) => v.moduleId === moduleId && v.videoType === videoType && v.videoId === videoId);
  if (i === -1) return false;
  videosStore.splice(i, 1);
  persistVideos();
  return true;
}

export function getVideoById(moduleId: number, videoType: string, videoId: number): VideoRecord | undefined {
  loadData();
  return videosStore.find((v) => v.moduleId === moduleId && v.videoType === videoType && v.videoId === videoId);
}

// --- Users (for admin login) ---
export function getUserByUsername(username: string): UserRecord | undefined {
  loadData();
  return usersStore.get(username);
}

export function getUserById(id: string): UserRecord | undefined {
  loadData();
  return Array.from(usersStore.values()).find((u) => u.id === id);
}

export function getAllUsers(opts?: { role?: 'user' | 'admin'; search?: string }): UserRecord[] {
  loadData();
  let list = Array.from(usersStore.values());
  if (opts?.role) list = list.filter((u) => u.role === opts.role);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    list = list.filter((u) => u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }
  return list;
}

export function createUser(data: Omit<UserRecord, 'passwordHash'> & { password: string }): UserRecord {
  loadData();
  const bcrypt = require('bcryptjs');
  const passwordHash = bcrypt.hashSync(data.password, 10);
  const record: UserRecord = {
    id: data.id,
    username: data.username,
    email: data.email,
    passwordHash,
    role: data.role,
  };
  if (usersStore.has(data.username)) throw new Error(`User ${data.username} already exists`);
  usersStore.set(data.username, record);
  persistUsers();
  return record;
}

export function verifyUserPassword(username: string, password: string): boolean {
  const user = getUserByUsername(username);
  if (!user) return false;
  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(password, user.passwordHash);
}

export function updateUserById(
  id: string,
  updates: Partial<Pick<UserRecord, 'username' | 'email' | 'role'> & { password?: string }>
): UserRecord | null {
  loadData();
  const user = getUserById(id);
  if (!user) return null;
  const oldUsername = user.username;
  const next: UserRecord = {
    id: user.id,
    username: updates.username ?? user.username,
    email: updates.email ?? user.email,
    role: updates.role ?? user.role,
    passwordHash: user.passwordHash,
  };
  if (updates.password) {
    const bcrypt = require('bcryptjs');
    next.passwordHash = bcrypt.hashSync(updates.password, 10);
  }
  usersStore.delete(oldUsername);
  usersStore.set(next.username, next);
  persistUsers();
  return next;
}

export function deleteUserById(id: string): boolean {
  loadData();
  const user = getUserById(id);
  if (!user) return false;
  usersStore.delete(user.username);
  persistUsers();
  return true;
}

// --- Login history ---
export function addLoginHistory(record: LoginHistoryRecord): void {
  loginHistoryStore.push(record);
  if (loginHistoryStore.length > 1000) loginHistoryStore.shift();
}

export function getLoginHistory(limit = 100): LoginHistoryRecord[] {
  return [...loginHistoryStore].reverse().slice(0, limit);
}

// --- Persist modules/questions to file (admin data/save) ---
export function replaceModulesAndQuestions(
  newModules: ModuleRecord[],
  newQuestionsByModule: Record<string, Omit<QuestionRecord, 'moduleId'>[]>
): void {
  modules.length = 0;
  modules.push(...newModules.map((m) => ({ ...m })));
  for (const key of Object.keys(questionsByModule)) delete questionsByModule[key];
  for (const [modId, list] of Object.entries(newQuestionsByModule)) {
    const moduleIdNum = parseInt(modId, 10);
    questionsByModule[modId] = (list || []).map((q) => ({ ...q, moduleId: moduleIdNum }));
  }
  persistData();
}

function persistData(): void {
  try {
    const questionsOut: Record<string, Array<Omit<QuestionRecord, 'moduleId'>>> = {};
    for (const [modId, list] of Object.entries(questionsByModule)) {
      questionsOut[modId] = list.map(({ moduleId: _, ...q }) => ({ ...q }));
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ modules, questions: questionsOut }, null, 2),
      'utf8'
    );
  } catch (e) {
    console.warn('Store: could not persist app-data.json', e);
  }
}

// --- Health (no DB) ---
export function getStoreStatus(): { modules: number; questions: number; users: number } {
  loadData();
  let questionCount = 0;
  for (const list of Object.values(questionsByModule)) questionCount += list.length;
  return { modules: modules.length, questions: questionCount, users: usersStore.size };
}
