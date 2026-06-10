import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'salon.db')
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Ensure directories exist
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    tags TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS generated_posts (
    id TEXT PRIMARY KEY,
    employee_name TEXT,
    platform TEXT,
    goal TEXT,
    post_text TEXT,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    posted INTEGER DEFAULT 0,
    facebook_post_id TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS post_ratings (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    notes TEXT DEFAULT '',
    rated_by TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

export default db
