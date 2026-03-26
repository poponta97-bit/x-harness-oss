import { Hono } from 'hono';
import { createTag, getTags, getTagById, updateTag, deleteTag } from '@x-harness/db';
import type { Env } from '../index.js';

const tags = new Hono<Env>();

function serialize(row: any) {
  return {
    id: row.id,
    xAccountId: row.x_account_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

tags.post('/api/tags', async (c) => {
  const { xAccountId, name, color } = await c.req.json<{ xAccountId: string; name: string; color?: string }>();
  if (!xAccountId || !name) return c.json({ success: false, error: 'Missing required fields: xAccountId, name' }, 400);
  const tag = await createTag(c.env.DB, xAccountId, name, color);
  return c.json({ success: true, data: serialize(tag) }, 201);
});

tags.get('/api/tags', async (c) => {
  const xAccountId = c.req.query('xAccountId');
  const items = await getTags(c.env.DB, xAccountId ?? undefined);
  return c.json({ success: true, data: items.map(serialize) });
});

tags.put('/api/tags/:id', async (c) => {
  const body = await c.req.json<{ name?: string; color?: string }>();
  const tag = await updateTag(c.env.DB, c.req.param('id'), body);
  if (!tag) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: serialize(tag) });
});

tags.delete('/api/tags/:id', async (c) => {
  await deleteTag(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

export { tags };
