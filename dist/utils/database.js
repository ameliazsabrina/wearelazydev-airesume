import Database from "better-sqlite3";
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
export const dbUtils = {
    addVerifiedPR: (userId, owner, repo, pull_number) => {
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO verified_prs (user_id, owner, repo, pull_number)
      VALUES (?, ?, ?, ?)
    `);
        return stmt.run(userId, owner, repo, pull_number);
    },
    getVerifiedPRs: (userId) => {
        const stmt = db.prepare(`
      SELECT owner, repo, pull_number, verified
      FROM verified_prs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
        return stmt.all(userId);
    },
    isPRVerified: (userId, owner, repo, pull_number) => {
        const stmt = db.prepare(`
      SELECT 1
      FROM verified_prs
      WHERE user_id = ? AND owner = ? AND repo = ? AND pull_number = ?
    `);
        return stmt.get(userId, owner, repo, pull_number) !== undefined;
    },
    getVerifiedPRCount: (userId) => {
        const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM verified_prs
      WHERE user_id = ?
    `);
        const result = stmt.get(userId);
        return result?.count ?? 0;
    },
};
//# sourceMappingURL=database.js.map