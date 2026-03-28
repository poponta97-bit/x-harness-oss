import { Hono } from 'hono';
import { XClient } from '@x-harness/x-sdk';
import { createScheduledPost, getScheduledPosts, deleteScheduledPost, getXAccountById } from '@x-harness/db';
import type { Env } from '../index.js';

const posts = new Hono<Env>();

posts.post('/api/posts', async (c) => {
  const { xAccountId, text, mediaIds } = await c.req.json<{ xAccountId: string; text: string; mediaIds?: string[] }>();
  if (!text || !xAccountId) return c.json({ success: false, error: 'Missing required fields: xAccountId, text' }, 400);
  const account = await getXAccountById(c.env.DB, xAccountId);
  if (!account) return c.json({ success: false, error: 'X account not found' }, 404);
  const xClient = account.consumer_key && account.consumer_secret && account.access_token_secret
    ? new XClient({
        type: 'oauth1',
        consumerKey: account.consumer_key,
        consumerSecret: account.consumer_secret,
        accessToken: account.access_token,
        accessTokenSecret: account.access_token_secret,
      })
    : new XClient(account.access_token);
  try {
    const tweet = await xClient.createTweet({
      text,
      media: mediaIds ? { media_ids: mediaIds } : undefined,
    });
    return c.json({ success: true, data: tweet }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message ?? 'Failed to create tweet' }, 500);
  }
});

posts.post('/api/posts/schedule', async (c) => {
  const { xAccountId, text, scheduledAt, mediaIds } = await c.req.json<{
    xAccountId: string; text: string; scheduledAt: string; mediaIds?: string[];
  }>();
  if (!xAccountId || !text || !scheduledAt) {
    return c.json({ success: false, error: 'Missing required fields: xAccountId, text, scheduledAt' }, 400);
  }
  const account = await getXAccountById(c.env.DB, xAccountId);
  if (!account) return c.json({ success: false, error: 'X account not found' }, 404);
  const post = await createScheduledPost(c.env.DB, xAccountId, text, scheduledAt, mediaIds);
  return c.json({
    success: true,
    data: {
      id: post.id,
      xAccountId: post.x_account_id,
      text: post.text,
      mediaIds: post.media_ids ? JSON.parse(post.media_ids) : null,
      scheduledAt: post.scheduled_at,
      status: post.status,
      postedTweetId: post.posted_tweet_id,
      createdAt: post.created_at,
    },
  }, 201);
});

posts.get('/api/posts/scheduled', async (c) => {
  const xAccountId = c.req.query('xAccountId');
  const items = await getScheduledPosts(c.env.DB, { status: 'scheduled', xAccountId: xAccountId ?? undefined });
  return c.json({
    success: true,
    data: items.map((p) => ({
      id: p.id,
      xAccountId: p.x_account_id,
      text: p.text,
      mediaIds: p.media_ids ? JSON.parse(p.media_ids) : null,
      scheduledAt: p.scheduled_at,
      status: p.status,
      postedTweetId: p.posted_tweet_id,
      createdAt: p.created_at,
    })),
  });
});

posts.delete('/api/posts/scheduled/:id', async (c) => {
  await deleteScheduledPost(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

export { posts };
