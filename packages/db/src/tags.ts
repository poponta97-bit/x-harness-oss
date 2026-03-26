import { jstNow } from './utils.js';

export interface DbTag {
  id: string;
  x_account_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export async function createTag(db: D1Database, xAccountId: string, name: string, color?: string): Promise<DbTag> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare('INSERT INTO tags (id, x_account_id, name, color, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .bind(id, xAccountId, name, color ?? '#3B82F6', now)
    .first<DbTag>();
  return result!;
}

export async function getTags(db: D1Database, xAccountId?: string): Promise<DbTag[]> {
  if (xAccountId) {
    const result = await db.prepare('SELECT * FROM tags WHERE x_account_id = ? ORDER BY name').bind(xAccountId).all<DbTag>();
    return result.results;
  }
  const result = await db.prepare('SELECT * FROM tags ORDER BY name').all<DbTag>();
  return result.results;
}

export async function getTagById(db: D1Database, id: string): Promise<DbTag | null> {
  return db.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<DbTag>();
}

export async function updateTag(db: D1Database, id: string, updates: { name?: string; color?: string }): Promise<DbTag | null> {
  const existing = await getTagById(db, id);
  if (!existing) return null;
  const result = await db
    .prepare('UPDATE tags SET name = ?, color = ? WHERE id = ? RETURNING *')
    .bind(updates.name ?? existing.name, updates.color ?? existing.color, id)
    .first<DbTag>();
  return result;
}

export async function deleteTag(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
}
