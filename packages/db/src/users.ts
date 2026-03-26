import { jstNow } from './utils.js';

export interface DbUser {
  id: string;
  email: string | null;
  phone: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export async function createUser(db: D1Database, email?: string, phone?: string, metadata?: Record<string, unknown>): Promise<DbUser> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare('INSERT INTO users (id, email, phone, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(id, email ?? null, phone ?? null, JSON.stringify(metadata ?? {}), now, now)
    .first<DbUser>();
  return result!;
}

export async function getUserById(db: D1Database, id: string): Promise<DbUser | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<DbUser>();
}

export async function linkFollowerToUser(db: D1Database, followerId: string, userId: string): Promise<void> {
  const now = jstNow();
  await db.prepare('UPDATE followers SET user_id = ?, updated_at = ? WHERE id = ?').bind(userId, now, followerId).run();
}
