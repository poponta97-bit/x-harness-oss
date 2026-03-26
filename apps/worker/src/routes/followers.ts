import { Hono } from 'hono';
import { getFollowers, getFollowerById, getFollowerCount, addTagToFollower, removeTagFromFollower, getFollowerTags, getTagById } from '@x-harness/db';
import type { Env } from '../index.js';

const followers = new Hono<Env>();

function serialize(row: any) {
  return {
    id: row.id,
    xAccountId: row.x_account_id,
    xUserId: row.x_user_id,
    username: row.username,
    displayName: row.display_name,
    profileImageUrl: row.profile_image_url,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    isFollowing: !!row.is_following,
    isFollowed: !!row.is_followed,
    userId: row.user_id,
    metadata: JSON.parse(row.metadata || '{}'),
    firstSeenAt: row.first_seen_at,
    unfollowedAt: row.unfollowed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

followers.get('/api/followers', async (c) => {
  const limit = Number(c.req.query('limit') ?? '50');
  const offset = Number(c.req.query('offset') ?? '0');
  const tagId = c.req.query('tagId');
  const xAccountId = c.req.query('xAccountId');
  const [items, total] = await Promise.all([
    getFollowers(c.env.DB, { limit, offset, tagId: tagId ?? undefined, xAccountId: xAccountId ?? undefined }),
    getFollowerCount(c.env.DB, { tagId: tagId ?? undefined, xAccountId: xAccountId ?? undefined }),
  ]);
  return c.json({
    success: true,
    data: {
      items: items.map(serialize),
      total,
      page: Math.floor(offset / limit),
      limit,
      hasNextPage: offset + limit < total,
    },
  });
});

followers.get('/api/followers/:id', async (c) => {
  const follower = await getFollowerById(c.env.DB, c.req.param('id'));
  if (!follower) return c.json({ success: false, error: 'Not found' }, 404);
  const rawTags = await getFollowerTags(c.env.DB, follower.id);
  // Enrich tags with x_account_id and created_at for a full Tag object
  const tags = await Promise.all(
    rawTags.map(async (t) => {
      const full = await getTagById(c.env.DB, t.id);
      return full
        ? { id: full.id, xAccountId: full.x_account_id, name: full.name, color: full.color, createdAt: full.created_at }
        : { id: t.id, xAccountId: null, name: t.name, color: t.color, createdAt: null };
    }),
  );
  return c.json({ success: true, data: { ...serialize(follower), tags } });
});

followers.post('/api/followers/:id/tags', async (c) => {
  const { tagId } = await c.req.json<{ tagId: string }>();
  if (!tagId) return c.json({ success: false, error: 'Missing required field: tagId' }, 400);
  // Verify the follower and tag belong to the same X account to prevent cross-account tag assignment
  const [follower, tag] = await Promise.all([
    getFollowerById(c.env.DB, c.req.param('id')),
    getTagById(c.env.DB, tagId),
  ]);
  if (!follower) return c.json({ success: false, error: 'Follower not found' }, 404);
  if (!tag) return c.json({ success: false, error: 'Tag not found' }, 404);
  if (follower.x_account_id !== tag.x_account_id) {
    return c.json({ success: false, error: 'Tag and follower must belong to the same X account' }, 400);
  }
  await addTagToFollower(c.env.DB, c.req.param('id'), tagId);
  return c.json({ success: true });
});

followers.delete('/api/followers/:id/tags/:tagId', async (c) => {
  await removeTagFromFollower(c.env.DB, c.req.param('id'), c.req.param('tagId'));
  return c.json({ success: true });
});

export { followers };
