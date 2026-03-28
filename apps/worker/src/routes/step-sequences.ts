import { Hono } from 'hono';
import {
  createStepSequence, getStepSequences, getStepSequenceById, deleteStepSequence,
  addStepMessage, getStepMessages, enrollUser, getEnrollments,
} from '@x-harness/db';
import type { Env } from '../index.js';

const stepSequences = new Hono<Env>();

stepSequences.post('/api/step-sequences', async (c) => {
  const { xAccountId, name } = await c.req.json<{ xAccountId: string; name: string }>();
  if (!xAccountId || !name) return c.json({ success: false, error: 'Missing xAccountId or name' }, 400);
  const seq = await createStepSequence(c.env.DB, xAccountId, name);
  return c.json({ success: true, data: seq }, 201);
});

stepSequences.get('/api/step-sequences', async (c) => {
  const xAccountId = c.req.query('xAccountId');
  const seqs = await getStepSequences(c.env.DB, xAccountId ?? undefined);
  return c.json({ success: true, data: seqs });
});

stepSequences.get('/api/step-sequences/:id', async (c) => {
  const seq = await getStepSequenceById(c.env.DB, c.req.param('id'));
  if (!seq) return c.json({ success: false, error: 'Not found' }, 404);
  const messages = await getStepMessages(c.env.DB, seq.id);
  return c.json({ success: true, data: { ...seq, messages } });
});

stepSequences.delete('/api/step-sequences/:id', async (c) => {
  await deleteStepSequence(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

stepSequences.post('/api/step-sequences/:id/messages', async (c) => {
  const { stepOrder, delayMinutes, actionType, template, link, conditionTag } = await c.req.json<{
    stepOrder: number; delayMinutes: number; actionType: string; template: string; link?: string; conditionTag?: string;
  }>();
  if (stepOrder === undefined || delayMinutes === undefined || !actionType || !template) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }
  const msg = await addStepMessage(c.env.DB, c.req.param('id'), stepOrder, delayMinutes, actionType, template, link, conditionTag);
  return c.json({ success: true, data: msg }, 201);
});

stepSequences.post('/api/step-sequences/:id/enroll', async (c) => {
  const { xUserId, xUsername } = await c.req.json<{ xUserId: string; xUsername?: string }>();
  if (!xUserId) return c.json({ success: false, error: 'Missing xUserId' }, 400);
  const enrollment = await enrollUser(c.env.DB, c.req.param('id'), xUserId, xUsername ?? null);
  return c.json({ success: true, data: enrollment }, 201);
});

stepSequences.get('/api/step-sequences/:id/enrollments', async (c) => {
  const enrollments = await getEnrollments(c.env.DB, c.req.param('id'));
  return c.json({ success: true, data: enrollments });
});

export { stepSequences };
