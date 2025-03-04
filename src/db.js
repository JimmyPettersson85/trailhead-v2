import { DatabaseSync } from 'node:sqlite';

export const db = new DatabaseSync(process.env.DATABASE_PATH || 'trailhead.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trails (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    length_km REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL DEFAULT 'post',
    activity_id TEXT,
    created_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    reaction_id TEXT NOT NULL,
    PRIMARY KEY (user_id, activity_id)
  );
  CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL,
    target TEXT NOT NULL,
    PRIMARY KEY (follower_id, target)
  );
`);

export const now = () => new Date().toISOString();
