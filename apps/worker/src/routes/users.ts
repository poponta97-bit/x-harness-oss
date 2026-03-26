import { Hono } from 'hono';
import { createUser, getUserById, linkFollowerToUser, getFollowerById } from '@x-harness/db';
import type { Env } from '../index.js';

const users = new Hono<Env>();

users.post('/api/users', async (c) => {
  const { email, phone, metadata } = await c.req.json<{ email?: string; phone?: string; metadata?: Record<string, unknown> }>();
  const user = await createUser(c.env.DB, email, phone, metadata);
  return c.json({
    success: true,
    data: { id: user.id, email: user.email, phone: user.phone, metadata: JSON.parse(user.metadata), createdAt: user.created_at },
  }, 201);
});

users.get('/api/users/:id', async (c) => {
  const user = await getUserById(c.env.DB, c.req.param('id'));
  if (!user) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({
    success: true,
    data: { id: user.id, email: user.email, phone: user.phone, metadata: JSON.parse(user.metadata), createdAt: user.created_at },
  });
});

users.post('/api/users/:id/link', async (c) => {
  const { followerId } = await c.req.json<{ followerId: string }>();
  if (!followerId) return c.json({ success: false, error: 'Missing required field: followerId' }, 400);
  const [user, follower] = await Promise.all([
    getUserById(c.env.DB, c.req.param('id')),
    getFollowerById(c.env.DB, followerId),
  ]);
  if (!user) return c.json({ success: false, error: 'User not found' }, 404);
  if (!follower) return c.json({ success: false, error: 'Follower not found' }, 404);
  await linkFollowerToUser(c.env.DB, followerId, c.req.param('id'));
  return c.json({ success: true });
});

export { users };
