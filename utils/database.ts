import Database, { Statement, RunResult } from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "../database.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS verified_prs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    pull_number TEXT NOT NULL,
    verified BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, owner, repo, pull_number)
  )
`);

interface VerifiedPR {
  owner: string;
  repo: string;
  pull_number: string;
  verified: number; // SQLite stores BOOLEAN as 0 or 1
}

interface PRCount {
  count: number;
}

export const dbUtils = {
  addVerifiedPR: (userId: string, owner: string, repo: string, pull_number: string): RunResult => {
    const stmt: Statement<[string, string, string, string]> = db.prepare(`
      INSERT OR IGNORE INTO verified_prs (user_id, owner, repo, pull_number)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(userId, owner, repo, pull_number);
  },

  getVerifiedPRs: (userId: string): VerifiedPR[] => {
    const stmt: Statement<[string]> = db.prepare(`
      SELECT owner, repo, pull_number, verified
      FROM verified_prs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId) as VerifiedPR[];
  },

  isPRVerified: (userId: string, owner: string, repo: string, pull_number: string): boolean => {
    const stmt: Statement<[string, string, string, string]> = db.prepare(`
      SELECT 1
      FROM verified_prs
      WHERE user_id = ? AND owner = ? AND repo = ? AND pull_number = ?
    `);
    return stmt.get(userId, owner, repo, pull_number) !== undefined;
  },

  getVerifiedPRCount: (userId: string): number => {
    const stmt: Statement<[string]> = db.prepare(`
      SELECT COUNT(*) as count
      FROM verified_prs
      WHERE user_id = ?
    `);
    const result = stmt.get(userId) as PRCount | undefined;
    return result?.count ?? 0;
  },
};
