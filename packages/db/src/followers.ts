import { jstNow } from './utils.js';

export interface DbFollower {
  id: string;
  x_account_id: string;
  x_user_id: string;
  username: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  follower_count: number | null;
  following_count: number | null;
  is_following: number;
  is_followed: number;
  user_id: string | null;
  metadata: string;
  first_seen_at: string;
  unfollowed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getFollowers(db: D1Database, opts: { limit?: number; offset?: number; tagId?: string; xAccountId?: string } = {}): Promise<DbFollower[]> {
  const { limit = 50, offset = 0, tagId, xAccountId } = opts;
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (xAccountId) { conditions.push('f.x_account_id = ?'); binds.push(xAccountId); }
  if (tagId) { conditions.push('EXISTS (SELECT 1 FROM follower_tags ft WHERE ft.follower_id = f.id AND ft.tag_id = ?)'); binds.push(tagId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db
    .prepare(`SELECT f.* FROM followers f ${where} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset)
    .all<DbFollower>();
  return result.results;
}

export async function getFollowerCount(db: D1Database, opts: { tagId?: string; xAccountId?: string } = {}): Promise<number> {
  const { tagId, xAccountId } = opts;
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (xAccountId) { conditions.push('f.x_account_id = ?'); binds.push(xAccountId); }
  if (tagId) { conditions.push('EXISTS (SELECT 1 FROM follower_tags ft WHERE ft.follower_id = f.id AND ft.tag_id = ?)'); binds.push(tagId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = await db.prepare(`SELECT COUNT(*) as count FROM followers f ${where}`).bind(...binds).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function getFollowerById(db: D1Database, id: string): Promise<DbFollower | null> {
  return db.prepare('SELECT * FROM followers WHERE id = ?').bind(id).first<DbFollower>();
}

export async function getFollowerByXUserId(db: D1Database, xAccountId: string, xUserId: string): Promise<DbFollower | null> {
  return db.prepare('SELECT * FROM followers WHERE x_account_id = ? AND x_user_id = ?').bind(xAccountId, xUserId).first<DbFollower>();
}

export interface UpsertFollowerInput {
  xAccountId: string;
  xUserId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  followerCount?: number | null;
  followingCount?: number | null;
}

export async function upsertFollower(db: D1Database, input: UpsertFollowerInput): Promise<DbFollower> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare(`
      INSERT INTO followers (id, x_account_id, x_user_id, username, display_name, profile_image_url, follower_count, following_count, first_seen_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(x_account_id, x_user_id) DO UPDATE SET
        username = COALESCE(?, username),
        display_name = COALESCE(?, display_name),
        profile_image_url = COALESCE(?, profile_image_url),
        follower_count = COALESCE(?, follower_count),
        following_count = COALESCE(?, following_count),
        updated_at = ?
      RETURNING *
    `)
    .bind(
      id, input.xAccountId, input.xUserId,
      input.username ?? null, input.displayName ?? null, input.profileImageUrl ?? null,
      input.followerCount ?? null, input.followingCount ?? null,
      now, now, now,
      input.username ?? null, input.displayName ?? null, input.profileImageUrl ?? null,
      input.followerCount ?? null, input.followingCount ?? null, now,
    )
    .first<DbFollower>();
  return result!;
}

export async function addTagToFollower(db: D1Database, followerId: string, tagId: string): Promise<void> {
  const now = jstNow();
  await db.prepare('INSERT OR IGNORE INTO follower_tags (follower_id, tag_id, created_at) VALUES (?, ?, ?)').bind(followerId, tagId, now).run();
}

export async function removeTagFromFollower(db: D1Database, followerId: string, tagId: string): Promise<void> {
  await db.prepare('DELETE FROM follower_tags WHERE follower_id = ? AND tag_id = ?').bind(followerId, tagId).run();
}

export async function getFollowerTags(db: D1Database, followerId: string): Promise<{ id: string; name: string; color: string | null }[]> {
  const result = await db
    .prepare('SELECT t.id, t.name, t.color FROM tags t INNER JOIN follower_tags ft ON ft.tag_id = t.id WHERE ft.follower_id = ?')
    .bind(followerId)
    .all<{ id: string; name: string; color: string | null }>();
  return result.results;
}
