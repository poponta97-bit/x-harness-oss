import { jstNow } from './utils.js';

export interface DbXAccount {
  id: string;
  x_user_id: string;
  username: string;
  display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function createXAccount(db: D1Database, xUserId: string, username: string, accessToken: string, refreshToken?: string, displayName?: string): Promise<DbXAccount> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare('INSERT INTO x_accounts (id, x_user_id, username, display_name, access_token, refresh_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(id, xUserId, username, displayName ?? null, accessToken, refreshToken ?? null, now, now)
    .first<DbXAccount>();
  return result!;
}

export async function getXAccounts(db: D1Database): Promise<DbXAccount[]> {
  const result = await db.prepare('SELECT * FROM x_accounts WHERE is_active = 1 ORDER BY created_at').all<DbXAccount>();
  return result.results;
}

export async function getXAccountById(db: D1Database, id: string): Promise<DbXAccount | null> {
  return db.prepare('SELECT * FROM x_accounts WHERE id = ?').bind(id).first<DbXAccount>();
}

export async function updateXAccount(db: D1Database, id: string, updates: { accessToken?: string; refreshToken?: string; isActive?: boolean }): Promise<void> {
  const now = jstNow();
  const existing = await getXAccountById(db, id);
  if (!existing) return;
  await db
    .prepare('UPDATE x_accounts SET access_token = ?, refresh_token = ?, is_active = ?, updated_at = ? WHERE id = ?')
    .bind(
      updates.accessToken ?? existing.access_token,
      updates.refreshToken ?? existing.refresh_token,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active,
      now, id,
    )
    .run();
}
