import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "maitong.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      used_by TEXT,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      question TEXT NOT NULL,
      departments TEXT,
      advisor_responses TEXT,
      synthesis TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS request_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      ip TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// --- User ---
export function createUser(name: string, role: string, passwordHash: string): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO users (id, name, role, password_hash) VALUES (?, ?, ?, ?)")
    .run(id, name, role, passwordHash);
  return id;
}

export function getUserByName(name: string) {
  return getDb().prepare("SELECT * FROM users WHERE name = ?").get(name) as
    | { id: string; name: string; role: string; password_hash: string }
    | undefined;
}

export function getUserById(id: string) {
  return getDb().prepare("SELECT id, name, role FROM users WHERE id = ?").get(id) as
    | { id: string; name: string; role: string }
    | undefined;
}

// --- Invite Codes ---
export function createInviteCode(createdBy: string, hoursValid = 48): string {
  const code = crypto.randomBytes(4).toString("hex").toUpperCase();
  const expires = new Date(Date.now() + hoursValid * 3600_000).toISOString();
  getDb()
    .prepare("INSERT INTO invite_codes (code, created_by, expires_at) VALUES (?, ?, ?)")
    .run(code, createdBy, expires);
  return code;
}

export function useInviteCode(code: string, userId: string): boolean {
  const row = getDb()
    .prepare("SELECT * FROM invite_codes WHERE code = ? AND used_by IS NULL AND expires_at > datetime('now')")
    .get(code) as { code: string } | undefined;
  if (!row) return false;
  getDb()
    .prepare("UPDATE invite_codes SET used_by = ?, used_at = datetime('now') WHERE code = ?")
    .run(userId, code);
  return true;
}

// --- Sessions ---
export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 3600_000).toISOString(); // 7 days
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires);
  return token;
}

export function getSession(token: string) {
  return getDb()
    .prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token) as { token: string; user_id: string } | undefined;
}

export function deleteSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// --- Rate Limiting ---
export function checkRateLimit(userId: string, dailyLimit = 30): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const row = getDb()
    .prepare("SELECT count FROM rate_limits WHERE user_id = ? AND date = ?")
    .get(userId, today) as { count: number } | undefined;
  return !row || row.count < dailyLimit;
}

export function incrementRateLimit(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  getDb()
    .prepare(
      `INSERT INTO rate_limits (user_id, date, count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1`
    )
    .run(userId, today);
}

export function getRateLimitCount(userId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const row = getDb()
    .prepare("SELECT count FROM rate_limits WHERE user_id = ? AND date = ?")
    .get(userId, today) as { count: number } | undefined;
  return row?.count ?? 0;
}

// --- Questions ---
export function saveQuestion(
  userId: string,
  question: string,
  advisorResponses: Record<string, string>,
  synthesis: string,
  departments?: string[]
): string {
  const id = crypto.randomUUID();
  getDb()
    .prepare("INSERT INTO questions (id, user_id, question, departments, advisor_responses, synthesis) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, userId, question, departments ? JSON.stringify(departments) : null, JSON.stringify(advisorResponses), synthesis);
  return id;
}

export function getQuestionsByUser(userId: string, limit = 20) {
  return getDb()
    .prepare("SELECT * FROM questions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as Array<{
    id: string;
    user_id: string;
    question: string;
    advisor_responses: string;
    synthesis: string;
    created_at: string;
  }>;
}

export function getAllQuestions(limit = 50) {
  return getDb()
    .prepare(
      `SELECT q.*, u.name as user_name, u.role as user_role
       FROM questions q JOIN users u ON q.user_id = u.id
       ORDER BY q.created_at DESC LIMIT ?`
    )
    .all(limit);
}

// --- Request Logging ---
export function logRequest(userId: string | null, ip: string, action: string, detail?: string) {
  getDb()
    .prepare("INSERT INTO request_log (user_id, ip, action, detail) VALUES (?, ?, ?, ?)")
    .run(userId, ip, action, detail ?? null);
}
