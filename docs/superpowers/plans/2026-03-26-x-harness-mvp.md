# X Harness OSS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP of X Harness OSS — an open-source X (Twitter) CRM/marketing automation tool with Engagement Gate as the killer feature.

**Architecture:** Cloudflare Workers + Hono API server with D1 database, mirroring LINE Harness OSS's monorepo structure. Cron triggers poll X API v2 every 5 minutes for engagement detection and scheduled post delivery. TypeScript SDK wraps the REST API for programmatic access.

**Tech Stack:** Cloudflare Workers, Hono, D1 (SQLite), TypeScript, pnpm workspace, X API v2 (OAuth 2.0), tsup

---

## File Structure

```
tools/x-harness/
├── package.json                          # Root monorepo config
├── pnpm-workspace.yaml                   # Workspace definition
├── tsconfig.base.json                    # Shared TS config
├── .gitignore
├── docs/
│   └── SPEC.md                           # Full specification
├── apps/
│   └── worker/
│       ├── package.json
│       ├── tsconfig.json
│       ├── wrangler.toml
│       └── src/
│           ├── index.ts                  # Hono app + cron handler
│           ├── middleware/
│           │   └── auth.ts               # Bearer token auth
│           ├── routes/
│           │   ├── health.ts             # GET /api/health
│           │   ├── engagement-gates.ts   # CRUD + deliveries
│           │   ├── followers.ts          # CRUD + tags
│           │   ├── tags.ts               # CRUD
│           │   ├── posts.ts              # Immediate + scheduled
│           │   ├── users.ts              # UUID management
│           │   └── x-accounts.ts         # X account management
│           └── services/
│               ├── engagement-gate.ts    # Like detection + mention delivery
│               ├── stealth.ts            # Jitter + rate limiting + template variation
│               ├── post-scheduler.ts     # Scheduled post processing
│               └── follower-sync.ts      # Follower diff sync
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── schema.sql                    # Full D1 schema
│   │   └── src/
│   │       ├── index.ts                  # Barrel export
│   │       ├── utils.ts                  # JST helpers
│   │       ├── engagement-gates.ts       # Gate + delivery queries
│   │       ├── followers.ts              # Follower queries
│   │       ├── tags.ts                   # Tag queries
│   │       ├── posts.ts                  # Scheduled post queries
│   │       ├── users.ts                  # UUID queries
│   │       └── x-accounts.ts            # Account queries
│   ├── x-sdk/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Barrel export
│   │       ├── client.ts                 # XClient class (X API v2 wrapper)
│   │       └── types.ts                  # X API response types
│   ├── sdk/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts                  # Barrel export
│   │       ├── client.ts                 # XHarness main client
│   │       ├── http.ts                   # HttpClient
│   │       ├── errors.ts                 # XHarnessError
│   │       ├── types.ts                  # SDK types
│   │       └── resources/
│   │           ├── engagement-gates.ts   # EngagementGatesResource
│   │           ├── followers.ts          # FollowersResource
│   │           ├── tags.ts               # TagsResource
│   │           ├── posts.ts              # PostsResource
│   │           └── users.ts              # UsersResource
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── types.ts                  # Shared API response types
```

---

## Task 1: Repository Scaffolding

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `docs/SPEC.md`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/axpr/claudecode/tools/x-harness
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "x-harness-oss",
  "version": "0.1.0",
  "private": true,
  "description": "Open-source X (Twitter) CRM/marketing automation — Xステップ代替",
  "scripts": {
    "dev:worker": "pnpm --filter worker dev",
    "build": "pnpm -r build",
    "deploy:worker": "pnpm --filter worker deploy",
    "db:migrate": "wrangler d1 execute x-harness --file=packages/db/schema.sql",
    "db:migrate:local": "wrangler d1 execute x-harness --file=packages/db/schema.sql --local",
    "typecheck": "pnpm -r typecheck"
  },
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.wrangler/
.dev.vars
*.log
```

- [ ] **Step 6: Save SPEC.md**

Copy the full spec content (already retrieved from Mac Mini) to `docs/SPEC.md`.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold x-harness-oss monorepo"
```

---

## Task 2: packages/shared — Shared Types

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@x-harness/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create types.ts**

```typescript
// API response envelope — same pattern as LINE Harness
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

// Engagement Gate types
export type TriggerType = 'like' | 'repost' | 'reply' | 'follow';
export type ActionType = 'mention_post' | 'dm';
export type DeliveryStatus = 'delivered' | 'failed' | 'pending';
export type PostStatus = 'scheduled' | 'posted' | 'failed';

export interface EngagementGate {
  id: string;
  xAccountId: string;
  postId: string;
  triggerType: TriggerType;
  actionType: ActionType;
  template: string;
  link: string | null;
  isActive: boolean;
  lineHarnessUrl: string | null;
  lineHarnessApiKey: string | null;
  lineHarnessTag: string | null;
  lineHarnessScenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementGateDelivery {
  id: string;
  gateId: string;
  xUserId: string;
  xUsername: string | null;
  deliveredPostId: string | null;
  status: DeliveryStatus;
  createdAt: string;
}

export interface Follower {
  id: string;
  xAccountId: string;
  xUserId: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  isFollowing: boolean;
  isFollowed: boolean;
  userId: string | null;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  unfollowedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  xAccountId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  xAccountId: string;
  text: string;
  mediaIds: string[] | null;
  scheduledAt: string;
  status: PostStatus;
  postedTweetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface XAccount {
  id: string;
  xUserId: string;
  username: string;
  displayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Create index.ts**

```typescript
export * from './types.js';
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared && git commit -m "feat: add shared types package"
```

---

## Task 3: packages/db — D1 Schema & Query Helpers

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/schema.sql`, `packages/db/src/utils.ts`, `packages/db/src/engagement-gates.ts`, `packages/db/src/followers.ts`, `packages/db/src/tags.ts`, `packages/db/src/posts.ts`, `packages/db/src/users.ts`, `packages/db/src/x-accounts.ts`, `packages/db/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@x-harness/db",
  "version": "0.1.0",
  "private": true,
  "description": "D1 database query helpers for X Harness",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "files": ["src", "schema.sql"],
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.9.3"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create schema.sql**

```sql
-- X Harness OSS — D1 Schema
-- Mirrors LINE Harness architecture for The Harness unification

-- X Accounts (1 deploy = 1 primary, but supports multi)
CREATE TABLE IF NOT EXISTS x_accounts (
  id TEXT PRIMARY KEY,
  x_user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Engagement Gates (secret reply — killer feature)
CREATE TABLE IF NOT EXISTS engagement_gates (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('like', 'repost', 'reply', 'follow')),
  action_type TEXT NOT NULL CHECK (action_type IN ('mention_post', 'dm')),
  template TEXT NOT NULL,
  link TEXT,
  is_active INTEGER DEFAULT 1,
  line_harness_url TEXT,
  line_harness_api_key TEXT,
  line_harness_tag TEXT,
  line_harness_scenario_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_engagement_gates_active ON engagement_gates(is_active);

-- Engagement Gate Deliveries (dedup tracking)
CREATE TABLE IF NOT EXISTS engagement_gate_deliveries (
  id TEXT PRIMARY KEY,
  gate_id TEXT NOT NULL REFERENCES engagement_gates(id) ON DELETE CASCADE,
  x_user_id TEXT NOT NULL,
  x_username TEXT,
  delivered_post_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('delivered', 'failed', 'pending')),
  created_at TEXT NOT NULL,
  UNIQUE(gate_id, x_user_id)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_gate_id ON engagement_gate_deliveries(gate_id);

-- Followers
CREATE TABLE IF NOT EXISTS followers (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  x_user_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  profile_image_url TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  is_following INTEGER DEFAULT 1,
  is_followed INTEGER DEFAULT 0,
  user_id TEXT,
  metadata TEXT DEFAULT '{}',
  first_seen_at TEXT NOT NULL,
  unfollowed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(x_account_id, x_user_id)
);
CREATE INDEX IF NOT EXISTS idx_followers_x_user_id ON followers(x_user_id);
CREATE INDEX IF NOT EXISTS idx_followers_user_id ON followers(user_id);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  created_at TEXT NOT NULL,
  UNIQUE(x_account_id, name)
);

-- Follower <-> Tag
CREATE TABLE IF NOT EXISTS follower_tags (
  follower_id TEXT NOT NULL REFERENCES followers(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_follower_tags_tag_id ON follower_tags(tag_id);

-- Scheduled Posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  text TEXT NOT NULL,
  media_ids TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed')),
  posted_tweet_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- Users (UUID — The Harness unification)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 4: Create src/utils.ts**

```typescript
const JST_OFFSET_MS = 9 * 60 * 60_000;

export function jstNow(): string {
  return toJstString(new Date());
}

export function toJstString(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return jst.toISOString().slice(0, -1) + '+09:00';
}

export function isTimeBefore(a: string, b: string): boolean {
  return new Date(a).getTime() <= new Date(b).getTime();
}
```

- [ ] **Step 5: Create src/engagement-gates.ts**

```typescript
import { jstNow } from './utils.js';

export interface DbEngagementGate {
  id: string;
  x_account_id: string;
  post_id: string;
  trigger_type: string;
  action_type: string;
  template: string;
  link: string | null;
  is_active: number;
  line_harness_url: string | null;
  line_harness_api_key: string | null;
  line_harness_tag: string | null;
  line_harness_scenario_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDelivery {
  id: string;
  gate_id: string;
  x_user_id: string;
  x_username: string | null;
  delivered_post_id: string | null;
  status: string;
  created_at: string;
}

export interface CreateGateInput {
  xAccountId: string;
  postId: string;
  triggerType: string;
  actionType: string;
  template: string;
  link?: string;
  lineHarnessUrl?: string;
  lineHarnessApiKey?: string;
  lineHarnessTag?: string;
  lineHarnessScenarioId?: string;
}

export async function createEngagementGate(db: D1Database, input: CreateGateInput): Promise<DbEngagementGate> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare(`
      INSERT INTO engagement_gates (id, x_account_id, post_id, trigger_type, action_type, template, link, line_harness_url, line_harness_api_key, line_harness_tag, line_harness_scenario_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `)
    .bind(id, input.xAccountId, input.postId, input.triggerType, input.actionType, input.template, input.link ?? null, input.lineHarnessUrl ?? null, input.lineHarnessApiKey ?? null, input.lineHarnessTag ?? null, input.lineHarnessScenarioId ?? null, now, now)
    .first<DbEngagementGate>();
  return result!;
}

export async function getEngagementGates(db: D1Database, opts: { activeOnly?: boolean } = {}): Promise<DbEngagementGate[]> {
  const where = opts.activeOnly ? 'WHERE is_active = 1' : '';
  const result = await db
    .prepare(`SELECT * FROM engagement_gates ${where} ORDER BY created_at DESC`)
    .all<DbEngagementGate>();
  return result.results;
}

export async function getEngagementGateById(db: D1Database, id: string): Promise<DbEngagementGate | null> {
  return db.prepare('SELECT * FROM engagement_gates WHERE id = ?').bind(id).first<DbEngagementGate>();
}

export async function updateEngagementGate(db: D1Database, id: string, updates: Partial<CreateGateInput & { isActive: boolean }>): Promise<DbEngagementGate | null> {
  const existing = await getEngagementGateById(db, id);
  if (!existing) return null;
  const now = jstNow();
  const result = await db
    .prepare(`
      UPDATE engagement_gates SET
        post_id = ?, trigger_type = ?, action_type = ?, template = ?, link = ?,
        is_active = ?, line_harness_url = ?, line_harness_api_key = ?, line_harness_tag = ?, line_harness_scenario_id = ?,
        updated_at = ?
      WHERE id = ? RETURNING *
    `)
    .bind(
      updates.postId ?? existing.post_id,
      updates.triggerType ?? existing.trigger_type,
      updates.actionType ?? existing.action_type,
      updates.template ?? existing.template,
      updates.link ?? existing.link,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active,
      updates.lineHarnessUrl ?? existing.line_harness_url,
      updates.lineHarnessApiKey ?? existing.line_harness_api_key,
      updates.lineHarnessTag ?? existing.line_harness_tag,
      updates.lineHarnessScenarioId ?? existing.line_harness_scenario_id,
      now, id,
    )
    .first<DbEngagementGate>();
  return result;
}

export async function deleteEngagementGate(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM engagement_gates WHERE id = ?').bind(id).run();
}

export async function getDeliveries(db: D1Database, gateId: string, opts: { limit?: number; offset?: number } = {}): Promise<DbDelivery[]> {
  const { limit = 50, offset = 0 } = opts;
  const result = await db
    .prepare('SELECT * FROM engagement_gate_deliveries WHERE gate_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(gateId, limit, offset)
    .all<DbDelivery>();
  return result.results;
}

export async function getDeliveredUserIds(db: D1Database, gateId: string): Promise<Set<string>> {
  const result = await db
    .prepare('SELECT x_user_id FROM engagement_gate_deliveries WHERE gate_id = ?')
    .bind(gateId)
    .all<{ x_user_id: string }>();
  return new Set(result.results.map((r) => r.x_user_id));
}

export async function createDelivery(db: D1Database, gateId: string, xUserId: string, xUsername: string | null, deliveredPostId: string | null, status: string): Promise<DbDelivery> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare('INSERT INTO engagement_gate_deliveries (id, gate_id, x_user_id, x_username, delivered_post_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(id, gateId, xUserId, xUsername, deliveredPostId, status, now)
    .first<DbDelivery>();
  return result!;
}
```

- [ ] **Step 6: Create src/followers.ts**

```typescript
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
```

- [ ] **Step 7: Create src/tags.ts**

```typescript
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
```

- [ ] **Step 8: Create src/posts.ts**

```typescript
import { jstNow } from './utils.js';

export interface DbScheduledPost {
  id: string;
  x_account_id: string;
  text: string;
  media_ids: string | null;
  scheduled_at: string;
  status: string;
  posted_tweet_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function createScheduledPost(db: D1Database, xAccountId: string, text: string, scheduledAt: string, mediaIds?: string[]): Promise<DbScheduledPost> {
  const id = crypto.randomUUID();
  const now = jstNow();
  const result = await db
    .prepare('INSERT INTO scheduled_posts (id, x_account_id, text, media_ids, scheduled_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(id, xAccountId, text, mediaIds ? JSON.stringify(mediaIds) : null, scheduledAt, 'scheduled', now, now)
    .first<DbScheduledPost>();
  return result!;
}

export async function getScheduledPosts(db: D1Database, opts: { status?: string; xAccountId?: string } = {}): Promise<DbScheduledPost[]> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (opts.status) { conditions.push('status = ?'); binds.push(opts.status); }
  if (opts.xAccountId) { conditions.push('x_account_id = ?'); binds.push(opts.xAccountId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.prepare(`SELECT * FROM scheduled_posts ${where} ORDER BY scheduled_at ASC`).bind(...binds).all<DbScheduledPost>();
  return result.results;
}

export async function getDueScheduledPosts(db: D1Database): Promise<DbScheduledPost[]> {
  const now = jstNow();
  const result = await db
    .prepare("SELECT * FROM scheduled_posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at ASC")
    .bind(now)
    .all<DbScheduledPost>();
  return result.results;
}

export async function updateScheduledPostStatus(db: D1Database, id: string, status: string, postedTweetId?: string): Promise<void> {
  const now = jstNow();
  await db
    .prepare('UPDATE scheduled_posts SET status = ?, posted_tweet_id = ?, updated_at = ? WHERE id = ?')
    .bind(status, postedTweetId ?? null, now, id)
    .run();
}

export async function deleteScheduledPost(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM scheduled_posts WHERE id = ?').bind(id).run();
}
```

- [ ] **Step 9: Create src/users.ts**

```typescript
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
```

- [ ] **Step 10: Create src/x-accounts.ts**

```typescript
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
```

- [ ] **Step 11: Create src/index.ts (barrel export)**

```typescript
export * from './utils.js';
export * from './engagement-gates.js';
export * from './followers.js';
export * from './tags.js';
export * from './posts.js';
export * from './users.js';
export * from './x-accounts.js';
```

- [ ] **Step 12: Commit**

```bash
git add packages/db && git commit -m "feat: add D1 schema and query helpers"
```

---

## Task 4: packages/x-sdk — X API v2 Wrapper

**Files:**
- Create: `packages/x-sdk/package.json`, `packages/x-sdk/tsconfig.json`, `packages/x-sdk/src/types.ts`, `packages/x-sdk/src/client.ts`, `packages/x-sdk/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@x-harness/x-sdk",
  "version": "0.1.0",
  "private": true,
  "description": "X API v2 typed wrapper",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/types.ts**

```typescript
export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

export interface XApiResponse<T> {
  data: T;
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

export interface XApiError {
  title: string;
  detail: string;
  type: string;
  status: number;
}

export interface CreateTweetParams {
  text: string;
  media?: { media_ids: string[] };
  reply?: { in_reply_to_tweet_id: string };
}
```

- [ ] **Step 4: Create src/client.ts**

```typescript
import type { XUser, XTweet, XApiResponse, CreateTweetParams } from './types.js';

export class XClient {
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.x.com/2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // --- Tweets ---

  async createTweet(params: CreateTweetParams): Promise<{ id: string; text: string }> {
    const res = await this.post<{ data: { id: string; text: string } }>('/tweets', params);
    return res.data;
  }

  async deleteTweet(tweetId: string): Promise<void> {
    await this.request('DELETE', `/tweets/${tweetId}`);
  }

  // --- Engagement ---

  async getLikingUsers(tweetId: string, paginationToken?: string): Promise<XApiResponse<XUser[]>> {
    const params = new URLSearchParams({ 'user.fields': 'profile_image_url,public_metrics' });
    if (paginationToken) params.set('pagination_token', paginationToken);
    return this.get<XApiResponse<XUser[]>>(`/tweets/${tweetId}/liking_users?${params}`);
  }

  async getRetweetedBy(tweetId: string, paginationToken?: string): Promise<XApiResponse<XUser[]>> {
    const params = new URLSearchParams({ 'user.fields': 'profile_image_url,public_metrics' });
    if (paginationToken) params.set('pagination_token', paginationToken);
    return this.get<XApiResponse<XUser[]>>(`/tweets/${tweetId}/retweeted_by?${params}`);
  }

  // --- Users ---

  async getMe(): Promise<XUser> {
    const res = await this.get<{ data: XUser }>('/users/me?user.fields=profile_image_url,public_metrics');
    return res.data;
  }

  async getUserById(userId: string): Promise<XUser> {
    const res = await this.get<{ data: XUser }>(`/users/${userId}?user.fields=profile_image_url,public_metrics`);
    return res.data;
  }

  async getUserByUsername(username: string): Promise<XUser> {
    const res = await this.get<{ data: XUser }>(`/users/by/username/${username}?user.fields=profile_image_url,public_metrics`);
    return res.data;
  }

  // --- Followers ---

  async getFollowers(userId: string, paginationToken?: string): Promise<XApiResponse<XUser[]>> {
    const params = new URLSearchParams({ max_results: '1000', 'user.fields': 'profile_image_url,public_metrics' });
    if (paginationToken) params.set('pagination_token', paginationToken);
    return this.get<XApiResponse<XUser[]>>(`/users/${userId}/followers?${params}`);
  }

  // --- Internal ---

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = { method, headers };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);

    if (res.status === 429) {
      const resetAt = res.headers.get('x-rate-limit-reset');
      throw new XApiRateLimitError(resetAt ? Number(resetAt) : undefined);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new XApiError(`X API ${method} ${path} failed: ${res.status} ${text}`, res.status);
    }

    return res.json() as Promise<T>;
  }
}

export class XApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'XApiError';
  }
}

export class XApiRateLimitError extends XApiError {
  constructor(public readonly resetAtEpoch?: number) {
    super('Rate limited by X API', 429);
    this.name = 'XApiRateLimitError';
  }
}
```

- [ ] **Step 5: Create src/index.ts**

```typescript
export { XClient, XApiError, XApiRateLimitError } from './client.js';
export type { XUser, XTweet, XApiResponse, CreateTweetParams } from './types.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/x-sdk && git commit -m "feat: add X API v2 typed wrapper"
```

---

## Task 5: apps/worker — Hono API Server (Routes)

**Files:**
- Create: `apps/worker/package.json`, `apps/worker/tsconfig.json`, `apps/worker/wrangler.toml`, `apps/worker/src/index.ts`, `apps/worker/src/middleware/auth.ts`, all route files

- [ ] **Step 1: Create package.json**

```json
{
  "name": "worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "@x-harness/db": "workspace:*",
    "@x-harness/x-sdk": "workspace:*",
    "@x-harness/shared": "workspace:*"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.9.3",
    "wrangler": "^3.99.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "x-harness-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
workers_dev = true

# Set via: wrangler secret put API_KEY
# Set via: wrangler secret put X_ACCESS_TOKEN
# Set via: wrangler secret put X_REFRESH_TOKEN

[vars]
WORKER_URL = "https://x-harness-worker.workers.dev"

[[d1_databases]]
binding = "DB"
database_name = "x-harness"
database_id = "PLACEHOLDER_CREATE_WITH_WRANGLER"

[triggers]
crons = ["*/5 * * * *"]
```

- [ ] **Step 4: Create src/index.ts**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { XClient } from '@x-harness/x-sdk';
import { getXAccounts } from '@x-harness/db';
import { authMiddleware } from './middleware/auth.js';
import { health } from './routes/health.js';
import { engagementGates } from './routes/engagement-gates.js';
import { followers } from './routes/followers.js';
import { tags } from './routes/tags.js';
import { posts } from './routes/posts.js';
import { users } from './routes/users.js';
import { xAccounts } from './routes/x-accounts.js';
import { processEngagementGates } from './services/engagement-gate.js';
import { processScheduledPosts } from './services/post-scheduler.js';

export type Env = {
  Bindings: {
    DB: D1Database;
    API_KEY: string;
    X_ACCESS_TOKEN: string;
    X_REFRESH_TOKEN: string;
    WORKER_URL: string;
  };
};

const app = new Hono<Env>();

app.use('*', cors({ origin: '*' }));
app.use('*', authMiddleware);

app.route('/', health);
app.route('/', engagementGates);
app.route('/', followers);
app.route('/', tags);
app.route('/', posts);
app.route('/', users);
app.route('/', xAccounts);

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));

async function scheduled(
  _event: ScheduledEvent,
  env: Env['Bindings'],
  _ctx: ExecutionContext,
): Promise<void> {
  const dbAccounts = await getXAccounts(env.DB);
  const tokens = new Set<string>();
  tokens.add(env.X_ACCESS_TOKEN);
  for (const account of dbAccounts) {
    tokens.add(account.access_token);
  }

  const jobs: Promise<void>[] = [];
  for (const token of tokens) {
    const xClient = new XClient(token);
    jobs.push(processEngagementGates(env.DB, xClient));
    jobs.push(processScheduledPosts(env.DB, xClient));
  }
  await Promise.allSettled(jobs);
}

export default {
  fetch: app.fetch,
  scheduled,
};
```

- [ ] **Step 5: Create src/middleware/auth.ts**

```typescript
import type { Context, Next } from 'hono';
import type { Env } from '../index.js';

export async function authMiddleware(c: Context<Env>, next: Next): Promise<Response | void> {
  const path = new URL(c.req.url).pathname;
  if (path === '/api/health') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice('Bearer '.length);
  if (token !== c.env.API_KEY) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  return next();
}
```

- [ ] **Step 6: Create src/routes/health.ts**

```typescript
import { Hono } from 'hono';
import type { Env } from '../index.js';

const health = new Hono<Env>();

health.get('/api/health', (c) => {
  return c.json({ success: true, data: { status: 'ok', version: '0.1.0' } });
});

export { health };
```

- [ ] **Step 7: Create src/routes/engagement-gates.ts**

```typescript
import { Hono } from 'hono';
import {
  createEngagementGate, getEngagementGates, getEngagementGateById,
  updateEngagementGate, deleteEngagementGate, getDeliveries,
} from '@x-harness/db';
import type { Env } from '../index.js';

const engagementGates = new Hono<Env>();

function serialize(row: any) {
  return {
    id: row.id,
    xAccountId: row.x_account_id,
    postId: row.post_id,
    triggerType: row.trigger_type,
    actionType: row.action_type,
    template: row.template,
    link: row.link,
    isActive: !!row.is_active,
    lineHarnessUrl: row.line_harness_url,
    lineHarnessApiKey: row.line_harness_api_key,
    lineHarnessTag: row.line_harness_tag,
    lineHarnessScenarioId: row.line_harness_scenario_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeDelivery(row: any) {
  return {
    id: row.id,
    gateId: row.gate_id,
    xUserId: row.x_user_id,
    xUsername: row.x_username,
    deliveredPostId: row.delivered_post_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

engagementGates.post('/api/engagement-gates', async (c) => {
  const body = await c.req.json();
  if (!body.xAccountId || !body.postId || !body.triggerType || !body.actionType || !body.template) {
    return c.json({ success: false, error: 'Missing required fields: xAccountId, postId, triggerType, actionType, template' }, 400);
  }
  const gate = await createEngagementGate(c.env.DB, body);
  return c.json({ success: true, data: serialize(gate) }, 201);
});

engagementGates.get('/api/engagement-gates', async (c) => {
  const gates = await getEngagementGates(c.env.DB);
  return c.json({ success: true, data: gates.map(serialize) });
});

engagementGates.get('/api/engagement-gates/:id', async (c) => {
  const gate = await getEngagementGateById(c.env.DB, c.req.param('id'));
  if (!gate) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: serialize(gate) });
});

engagementGates.put('/api/engagement-gates/:id', async (c) => {
  const body = await c.req.json();
  const gate = await updateEngagementGate(c.env.DB, c.req.param('id'), body);
  if (!gate) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: serialize(gate) });
});

engagementGates.delete('/api/engagement-gates/:id', async (c) => {
  await deleteEngagementGate(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

engagementGates.get('/api/engagement-gates/:id/deliveries', async (c) => {
  const limit = Number(c.req.query('limit') ?? '50');
  const offset = Number(c.req.query('offset') ?? '0');
  const deliveries = await getDeliveries(c.env.DB, c.req.param('id'), { limit, offset });
  return c.json({ success: true, data: deliveries.map(serializeDelivery) });
});

export { engagementGates };
```

- [ ] **Step 8: Create src/routes/followers.ts**

```typescript
import { Hono } from 'hono';
import { getFollowers, getFollowerById, getFollowerCount, addTagToFollower, removeTagFromFollower, getFollowerTags } from '@x-harness/db';
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
  const tags = await getFollowerTags(c.env.DB, follower.id);
  return c.json({ success: true, data: { ...serialize(follower), tags } });
});

followers.post('/api/followers/:id/tags', async (c) => {
  const { tagId } = await c.req.json<{ tagId: string }>();
  await addTagToFollower(c.env.DB, c.req.param('id'), tagId);
  return c.json({ success: true });
});

followers.delete('/api/followers/:id/tags/:tagId', async (c) => {
  await removeTagFromFollower(c.env.DB, c.req.param('id'), c.req.param('tagId'));
  return c.json({ success: true });
});

export { followers };
```

- [ ] **Step 9: Create src/routes/tags.ts**

```typescript
import { Hono } from 'hono';
import { createTag, getTags, getTagById, updateTag, deleteTag } from '@x-harness/db';
import type { Env } from '../index.js';

const tags = new Hono<Env>();

tags.post('/api/tags', async (c) => {
  const { xAccountId, name, color } = await c.req.json<{ xAccountId: string; name: string; color?: string }>();
  if (!xAccountId || !name) return c.json({ success: false, error: 'Missing required fields: xAccountId, name' }, 400);
  const tag = await createTag(c.env.DB, xAccountId, name, color);
  return c.json({ success: true, data: tag }, 201);
});

tags.get('/api/tags', async (c) => {
  const xAccountId = c.req.query('xAccountId');
  const items = await getTags(c.env.DB, xAccountId ?? undefined);
  return c.json({ success: true, data: items });
});

tags.put('/api/tags/:id', async (c) => {
  const body = await c.req.json<{ name?: string; color?: string }>();
  const tag = await updateTag(c.env.DB, c.req.param('id'), body);
  if (!tag) return c.json({ success: false, error: 'Not found' }, 404);
  return c.json({ success: true, data: tag });
});

tags.delete('/api/tags/:id', async (c) => {
  await deleteTag(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

export { tags };
```

- [ ] **Step 10: Create src/routes/posts.ts**

```typescript
import { Hono } from 'hono';
import { XClient } from '@x-harness/x-sdk';
import { createScheduledPost, getScheduledPosts, deleteScheduledPost } from '@x-harness/db';
import type { Env } from '../index.js';

const posts = new Hono<Env>();

// Immediate post
posts.post('/api/posts', async (c) => {
  const { text, mediaIds } = await c.req.json<{ text: string; mediaIds?: string[] }>();
  if (!text) return c.json({ success: false, error: 'Missing required field: text' }, 400);
  const xClient = new XClient(c.env.X_ACCESS_TOKEN);
  const tweet = await xClient.createTweet({
    text,
    media: mediaIds ? { media_ids: mediaIds } : undefined,
  });
  return c.json({ success: true, data: tweet }, 201);
});

// Schedule a post
posts.post('/api/posts/schedule', async (c) => {
  const { xAccountId, text, scheduledAt, mediaIds } = await c.req.json<{
    xAccountId: string; text: string; scheduledAt: string; mediaIds?: string[];
  }>();
  if (!xAccountId || !text || !scheduledAt) {
    return c.json({ success: false, error: 'Missing required fields: xAccountId, text, scheduledAt' }, 400);
  }
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
      createdAt: post.created_at,
    },
  }, 201);
});

// List scheduled posts
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

// Cancel a scheduled post
posts.delete('/api/posts/scheduled/:id', async (c) => {
  await deleteScheduledPost(c.env.DB, c.req.param('id'));
  return c.json({ success: true });
});

export { posts };
```

- [ ] **Step 11: Create src/routes/users.ts**

```typescript
import { Hono } from 'hono';
import { createUser, getUserById, linkFollowerToUser } from '@x-harness/db';
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
  await linkFollowerToUser(c.env.DB, followerId, c.req.param('id'));
  return c.json({ success: true });
});

export { users };
```

- [ ] **Step 12: Create src/routes/x-accounts.ts**

```typescript
import { Hono } from 'hono';
import { createXAccount, getXAccounts, updateXAccount } from '@x-harness/db';
import type { Env } from '../index.js';

const xAccounts = new Hono<Env>();

xAccounts.post('/api/x-accounts', async (c) => {
  const body = await c.req.json<{
    xUserId: string; username: string; accessToken: string; refreshToken?: string; displayName?: string;
  }>();
  if (!body.xUserId || !body.username || !body.accessToken) {
    return c.json({ success: false, error: 'Missing required fields' }, 400);
  }
  const account = await createXAccount(c.env.DB, body.xUserId, body.username, body.accessToken, body.refreshToken, body.displayName);
  return c.json({ success: true, data: { id: account.id, xUserId: account.x_user_id, username: account.username, displayName: account.display_name, isActive: !!account.is_active, createdAt: account.created_at } }, 201);
});

xAccounts.get('/api/x-accounts', async (c) => {
  const accounts = await getXAccounts(c.env.DB);
  return c.json({
    success: true,
    data: accounts.map((a) => ({
      id: a.id, xUserId: a.x_user_id, username: a.username,
      displayName: a.display_name, isActive: !!a.is_active, createdAt: a.created_at,
    })),
  });
});

xAccounts.put('/api/x-accounts/:id', async (c) => {
  const body = await c.req.json<{ accessToken?: string; refreshToken?: string; isActive?: boolean }>();
  await updateXAccount(c.env.DB, c.req.param('id'), body);
  return c.json({ success: true });
});

export { xAccounts };
```

- [ ] **Step 13: Commit**

```bash
git add apps/worker && git commit -m "feat: add Hono API server with all MVP routes"
```

---

## Task 6: apps/worker — Services (Engagement Gate + Stealth + Post Scheduler)

**Files:**
- Create: `apps/worker/src/services/stealth.ts`, `apps/worker/src/services/engagement-gate.ts`, `apps/worker/src/services/post-scheduler.ts`, `apps/worker/src/services/follower-sync.ts`

- [ ] **Step 1: Create src/services/stealth.ts**

```typescript
// Anti-ban stealth layer — same philosophy as LINE Harness

const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
const PUNCTUATION_VARIANTS: Record<string, string[]> = {
  '。': ['。', '．'],
  '！': ['！', '!'],
  '→': ['→', '⇒', '▶'],
};

export function addJitter(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function varyTemplate(template: string): string {
  // Insert a random zero-width char at a random position
  const pos = Math.floor(Math.random() * template.length);
  const zwc = ZERO_WIDTH_CHARS[Math.floor(Math.random() * ZERO_WIDTH_CHARS.length)];
  let result = template.slice(0, pos) + zwc + template.slice(pos);

  // Randomly swap punctuation
  for (const [original, variants] of Object.entries(PUNCTUATION_VARIANTS)) {
    if (result.includes(original) && Math.random() > 0.5) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      result = result.replace(original, variant);
    }
  }

  return result;
}

// Rate limiter: track sends per hour
const hourlyCounters = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(accountId: string, maxPerHour: number = 30): boolean {
  const now = Date.now();
  const counter = hourlyCounters.get(accountId);
  if (!counter || now > counter.resetAt) {
    hourlyCounters.set(accountId, { count: 0, resetAt: now + 3600_000 });
    return true;
  }
  return counter.count < maxPerHour;
}

export function incrementRateLimit(accountId: string): void {
  const counter = hourlyCounters.get(accountId);
  if (counter) counter.count++;
}
```

- [ ] **Step 2: Create src/services/engagement-gate.ts**

```typescript
import { XClient, XApiRateLimitError } from '@x-harness/x-sdk';
import {
  getEngagementGates, getDeliveredUserIds, createDelivery,
  upsertFollower,
} from '@x-harness/db';
import { addJitter, varyTemplate, checkRateLimit, incrementRateLimit } from './stealth.js';

export async function processEngagementGates(db: D1Database, xClient: XClient): Promise<void> {
  const gates = await getEngagementGates(db, { activeOnly: true });

  for (const gate of gates) {
    try {
      await processOneGate(db, xClient, gate);
    } catch (err) {
      if (err instanceof XApiRateLimitError) {
        console.error(`Rate limited — stopping engagement gate processing`);
        return;
      }
      console.error(`Error processing gate ${gate.id}:`, err);
    }
  }
}

async function processOneGate(
  db: D1Database,
  xClient: XClient,
  gate: { id: string; x_account_id: string; post_id: string; trigger_type: string; template: string; link: string | null },
): Promise<void> {
  // Get users who engaged
  let engagedUsers;
  if (gate.trigger_type === 'like') {
    engagedUsers = await xClient.getLikingUsers(gate.post_id);
  } else if (gate.trigger_type === 'repost') {
    engagedUsers = await xClient.getRetweetedBy(gate.post_id);
  } else {
    return; // reply/follow triggers are Phase 2
  }

  if (!engagedUsers.data || engagedUsers.data.length === 0) return;

  // Filter already-delivered
  const deliveredIds = await getDeliveredUserIds(db, gate.id);
  const newUsers = engagedUsers.data.filter((u) => !deliveredIds.has(u.id));

  for (const user of newUsers) {
    if (!checkRateLimit(gate.x_account_id)) {
      console.log(`Rate limit reached for account ${gate.x_account_id}, pausing`);
      return;
    }

    // Stealth jitter: 30s-3min delay
    await addJitter(30_000, 180_000);

    // Build mention text
    let text = gate.template.replace('{username}', user.username);
    if (gate.link) text = text.replace('{link}', gate.link);
    text = varyTemplate(text);

    try {
      // Post as @mention (NOT reply) — appears in notifications but not timeline
      const tweet = await xClient.createTweet({ text: `@${user.username} ${text}` });
      await createDelivery(db, gate.id, user.id, user.username, tweet.id, 'delivered');
      incrementRateLimit(gate.x_account_id);

      // Upsert follower record
      await upsertFollower(db, {
        xAccountId: gate.x_account_id,
        xUserId: user.id,
        username: user.username,
        displayName: user.name,
        profileImageUrl: user.profile_image_url,
        followerCount: user.public_metrics?.followers_count,
        followingCount: user.public_metrics?.following_count,
      });

      // LINE Harness integration (if configured) — fire and forget
      if (gate.line_harness_url && gate.line_harness_api_key) {
        triggerLineHarness(gate.line_harness_url, gate.line_harness_api_key, gate.line_harness_tag, gate.line_harness_scenario_id, user.username).catch(() => {});
      }
    } catch (err) {
      if (err instanceof XApiRateLimitError) throw err;
      console.error(`Failed to deliver to @${user.username}:`, err);
      await createDelivery(db, gate.id, user.id, user.username, null, 'failed');
    }
  }
}

async function triggerLineHarness(
  apiUrl: string, apiKey: string, tag: string | null, scenarioId: string | null, xUsername: string,
): Promise<void> {
  // Tag the user in LINE Harness (if they exist by x_username metadata match)
  if (tag) {
    await fetch(`${apiUrl}/api/friends/tag-by-metadata`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadataKey: 'x_username', metadataValue: xUsername, tagName: tag }),
    });
  }
}
```

- [ ] **Step 3: Create src/services/post-scheduler.ts**

```typescript
import { XClient } from '@x-harness/x-sdk';
import { getDueScheduledPosts, updateScheduledPostStatus } from '@x-harness/db';

export async function processScheduledPosts(db: D1Database, xClient: XClient): Promise<void> {
  const duePosts = await getDueScheduledPosts(db);

  for (const post of duePosts) {
    try {
      const tweet = await xClient.createTweet({
        text: post.text,
        media: post.media_ids ? { media_ids: JSON.parse(post.media_ids) } : undefined,
      });
      await updateScheduledPostStatus(db, post.id, 'posted', tweet.id);
    } catch (err) {
      console.error(`Failed to post scheduled ${post.id}:`, err);
      await updateScheduledPostStatus(db, post.id, 'failed');
    }
  }
}
```

- [ ] **Step 4: Create src/services/follower-sync.ts**

```typescript
import { XClient } from '@x-harness/x-sdk';
import { upsertFollower } from '@x-harness/db';

export async function syncFollowers(db: D1Database, xClient: XClient, xAccountId: string): Promise<void> {
  const me = await xClient.getMe();
  let paginationToken: string | undefined;

  do {
    const response = await xClient.getFollowers(me.id, paginationToken);
    if (!response.data) break;

    for (const user of response.data) {
      await upsertFollower(db, {
        xAccountId,
        xUserId: user.id,
        username: user.username,
        displayName: user.name,
        profileImageUrl: user.profile_image_url,
        followerCount: user.public_metrics?.followers_count,
        followingCount: user.public_metrics?.following_count,
      });
    }

    paginationToken = response.meta?.next_token;
  } while (paginationToken);
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/services && git commit -m "feat: add engagement gate processing, stealth layer, and post scheduler"
```

---

## Task 7: packages/sdk — @x-harness/sdk Client SDK

**Files:**
- Create: `packages/sdk/package.json`, `packages/sdk/tsconfig.json`, `packages/sdk/tsup.config.ts`, `packages/sdk/src/errors.ts`, `packages/sdk/src/http.ts`, `packages/sdk/src/types.ts`, `packages/sdk/src/resources/engagement-gates.ts`, `packages/sdk/src/resources/followers.ts`, `packages/sdk/src/resources/tags.ts`, `packages/sdk/src/resources/posts.ts`, `packages/sdk/src/resources/users.ts`, `packages/sdk/src/client.ts`, `packages/sdk/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@x-harness/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for X Harness — programmatic X account automation",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT",
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
});
```

- [ ] **Step 4: Create src/errors.ts**

```typescript
export class XHarnessError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
  ) {
    super(message);
    this.name = 'XHarnessError';
  }
}
```

- [ ] **Step 5: Create src/http.ts**

```typescript
import { XHarnessError } from './errors.js';

interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  async get<T = unknown>(path: string): Promise<T> { return this.request<T>('GET', path); }
  async post<T = unknown>(path: string, body?: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  async put<T = unknown>(path: string, body?: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  async delete<T = unknown>(path: string): Promise<T> { return this.request<T>('DELETE', path); }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    const options: RequestInit = { method, headers, signal: AbortSignal.timeout(this.timeout) };
    if (body !== undefined) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorBody = (await res.json()) as { error?: string };
        if (errorBody.error) errorMessage = errorBody.error;
      } catch { /* ignore */ }
      throw new XHarnessError(errorMessage, res.status, `${method} ${path}`);
    }
    return res.json() as Promise<T>;
  }
}
```

- [ ] **Step 6: Create src/types.ts**

```typescript
export interface XHarnessConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface EngagementGate {
  id: string;
  xAccountId: string;
  postId: string;
  triggerType: string;
  actionType: string;
  template: string;
  link: string | null;
  isActive: boolean;
  lineHarnessUrl: string | null;
  lineHarnessApiKey: string | null;
  lineHarnessTag: string | null;
  lineHarnessScenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementGateDelivery {
  id: string;
  gateId: string;
  xUserId: string;
  xUsername: string | null;
  deliveredPostId: string | null;
  status: string;
  createdAt: string;
}

export interface Follower {
  id: string;
  xAccountId: string;
  xUserId: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  isFollowing: boolean;
  isFollowed: boolean;
  userId: string | null;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  unfollowedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  xAccountId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  xAccountId: string;
  text: string;
  mediaIds: string[] | null;
  scheduledAt: string;
  status: string;
  postedTweetId: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateGateInput {
  xAccountId: string;
  postId: string;
  triggerType: string;
  actionType: string;
  template: string;
  link?: string;
  lineHarnessUrl?: string;
  lineHarnessApiKey?: string;
  lineHarnessTag?: string;
  lineHarnessScenarioId?: string;
}
```

- [ ] **Step 7: Create src/resources/engagement-gates.ts**

```typescript
import type { HttpClient } from '../http.js';
import type { ApiResponse, EngagementGate, EngagementGateDelivery, CreateGateInput } from '../types.js';

export class EngagementGatesResource {
  constructor(private readonly http: HttpClient) {}

  async create(input: CreateGateInput): Promise<EngagementGate> {
    const res = await this.http.post<ApiResponse<EngagementGate>>('/api/engagement-gates', input);
    return res.data;
  }

  async list(): Promise<EngagementGate[]> {
    const res = await this.http.get<ApiResponse<EngagementGate[]>>('/api/engagement-gates');
    return res.data;
  }

  async get(id: string): Promise<EngagementGate> {
    const res = await this.http.get<ApiResponse<EngagementGate>>(`/api/engagement-gates/${id}`);
    return res.data;
  }

  async update(id: string, input: Partial<CreateGateInput & { isActive: boolean }>): Promise<EngagementGate> {
    const res = await this.http.put<ApiResponse<EngagementGate>>(`/api/engagement-gates/${id}`, input);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/engagement-gates/${id}`);
  }

  async getDeliveries(id: string, params?: { limit?: number; offset?: number }): Promise<EngagementGateDelivery[]> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    const res = await this.http.get<ApiResponse<EngagementGateDelivery[]>>(`/api/engagement-gates/${id}/deliveries${query ? '?' + query : ''}`);
    return res.data;
  }
}
```

- [ ] **Step 8: Create src/resources/followers.ts**

```typescript
import type { HttpClient } from '../http.js';
import type { ApiResponse, PaginatedData, Follower } from '../types.js';

export class FollowersResource {
  constructor(private readonly http: HttpClient) {}

  async list(params?: { limit?: number; offset?: number; tagId?: string; xAccountId?: string }): Promise<PaginatedData<Follower>> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.tagId) qs.set('tagId', params.tagId);
    if (params?.xAccountId) qs.set('xAccountId', params.xAccountId);
    const query = qs.toString();
    const res = await this.http.get<ApiResponse<PaginatedData<Follower>>>(`/api/followers${query ? '?' + query : ''}`);
    return res.data;
  }

  async get(id: string): Promise<Follower> {
    const res = await this.http.get<ApiResponse<Follower>>(`/api/followers/${id}`);
    return res.data;
  }

  async addTag(followerId: string, tagId: string): Promise<void> {
    await this.http.post(`/api/followers/${followerId}/tags`, { tagId });
  }

  async removeTag(followerId: string, tagId: string): Promise<void> {
    await this.http.delete(`/api/followers/${followerId}/tags/${tagId}`);
  }
}
```

- [ ] **Step 9: Create src/resources/tags.ts**

```typescript
import type { HttpClient } from '../http.js';
import type { ApiResponse, Tag } from '../types.js';

export class TagsResource {
  constructor(private readonly http: HttpClient) {}

  async create(xAccountId: string, name: string, color?: string): Promise<Tag> {
    const res = await this.http.post<ApiResponse<Tag>>('/api/tags', { xAccountId, name, color });
    return res.data;
  }

  async list(xAccountId?: string): Promise<Tag[]> {
    const qs = xAccountId ? `?xAccountId=${xAccountId}` : '';
    const res = await this.http.get<ApiResponse<Tag[]>>(`/api/tags${qs}`);
    return res.data;
  }

  async update(id: string, updates: { name?: string; color?: string }): Promise<Tag> {
    const res = await this.http.put<ApiResponse<Tag>>(`/api/tags/${id}`, updates);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/tags/${id}`);
  }
}
```

- [ ] **Step 10: Create src/resources/posts.ts**

```typescript
import type { HttpClient } from '../http.js';
import type { ApiResponse, ScheduledPost } from '../types.js';

export class PostsResource {
  constructor(private readonly http: HttpClient) {}

  async post(text: string, mediaIds?: string[]): Promise<{ id: string; text: string }> {
    const res = await this.http.post<ApiResponse<{ id: string; text: string }>>('/api/posts', { text, mediaIds });
    return res.data;
  }

  async schedule(xAccountId: string, text: string, scheduledAt: string, mediaIds?: string[]): Promise<ScheduledPost> {
    const res = await this.http.post<ApiResponse<ScheduledPost>>('/api/posts/schedule', { xAccountId, text, scheduledAt, mediaIds });
    return res.data;
  }

  async listScheduled(xAccountId?: string): Promise<ScheduledPost[]> {
    const qs = xAccountId ? `?xAccountId=${xAccountId}` : '';
    const res = await this.http.get<ApiResponse<ScheduledPost[]>>(`/api/posts/scheduled${qs}`);
    return res.data;
  }

  async cancelScheduled(id: string): Promise<void> {
    await this.http.delete(`/api/posts/scheduled/${id}`);
  }
}
```

- [ ] **Step 11: Create src/resources/users.ts**

```typescript
import type { HttpClient } from '../http.js';
import type { ApiResponse, User } from '../types.js';

export class UsersResource {
  constructor(private readonly http: HttpClient) {}

  async create(email?: string, phone?: string, metadata?: Record<string, unknown>): Promise<User> {
    const res = await this.http.post<ApiResponse<User>>('/api/users', { email, phone, metadata });
    return res.data;
  }

  async get(id: string): Promise<User> {
    const res = await this.http.get<ApiResponse<User>>(`/api/users/${id}`);
    return res.data;
  }

  async linkFollower(userId: string, followerId: string): Promise<void> {
    await this.http.post(`/api/users/${userId}/link`, { followerId });
  }
}
```

- [ ] **Step 12: Create src/client.ts**

```typescript
import { HttpClient } from './http.js';
import { EngagementGatesResource } from './resources/engagement-gates.js';
import { FollowersResource } from './resources/followers.js';
import { TagsResource } from './resources/tags.js';
import { PostsResource } from './resources/posts.js';
import { UsersResource } from './resources/users.js';
import type { XHarnessConfig } from './types.js';

export class XHarness {
  readonly engagementGates: EngagementGatesResource;
  readonly followers: FollowersResource;
  readonly tags: TagsResource;
  readonly posts: PostsResource;
  readonly users: UsersResource;

  constructor(config: XHarnessConfig) {
    const http = new HttpClient({
      baseUrl: config.apiUrl.replace(/\/$/, ''),
      apiKey: config.apiKey,
      timeout: config.timeout ?? 30_000,
    });

    this.engagementGates = new EngagementGatesResource(http);
    this.followers = new FollowersResource(http);
    this.tags = new TagsResource(http);
    this.posts = new PostsResource(http);
    this.users = new UsersResource(http);
  }
}
```

- [ ] **Step 13: Create src/index.ts**

```typescript
export { XHarness } from './client.js';
export { XHarnessError } from './errors.js';
export type {
  XHarnessConfig,
  ApiResponse,
  PaginatedData,
  EngagementGate,
  EngagementGateDelivery,
  Follower,
  Tag,
  ScheduledPost,
  User,
  CreateGateInput,
} from './types.js';
```

- [ ] **Step 14: Commit**

```bash
git add packages/sdk && git commit -m "feat: add @x-harness/sdk TypeScript client"
```

---

## Task 8: Install Dependencies & Typecheck

- [ ] **Step 1: Run pnpm install**

```bash
cd /Users/axpr/claudecode/tools/x-harness && pnpm install
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Fix any type errors found**

Fix errors iteratively until `pnpm typecheck` passes for all packages.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A && git commit -m "fix: resolve typecheck errors"
```

---

## Task 9: Test Local Dev Server

- [ ] **Step 1: Create D1 database**

```bash
cd /Users/axpr/claudecode/tools/x-harness && npx wrangler d1 create x-harness
```

Update `wrangler.toml` `database_id` with the returned ID.

- [ ] **Step 2: Run local migration**

```bash
pnpm db:migrate:local
```

- [ ] **Step 3: Start dev server**

```bash
pnpm dev:worker
```

- [ ] **Step 4: Test health endpoint**

```bash
curl http://localhost:8787/api/health
```

Expected: `{"success":true,"data":{"status":"ok","version":"0.1.0"}}`

- [ ] **Step 5: Test engagement gate CRUD**

```bash
# Create
curl -X POST http://localhost:8787/api/engagement-gates \
  -H "Authorization: Bearer test-key" \
  -H "Content-Type: application/json" \
  -d '{"xAccountId":"acc1","postId":"12345","triggerType":"like","actionType":"mention_post","template":"特典はこちら→ {link}","link":"https://example.com"}'

# List
curl http://localhost:8787/api/engagement-gates -H "Authorization: Bearer test-key"
```

- [ ] **Step 6: Commit final state**

```bash
git add -A && git commit -m "chore: configure D1 database and verify local dev"
```

---

## Task Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Repository scaffolding | None |
| 2 | packages/shared (types) | Task 1 |
| 3 | packages/db (schema + queries) | Task 1 |
| 4 | packages/x-sdk (X API wrapper) | Task 1 |
| 5 | apps/worker (routes) | Tasks 2, 3, 4 |
| 6 | apps/worker (services) | Tasks 3, 4, 5 |
| 7 | packages/sdk (client SDK) | Task 1 |
| 8 | Install + typecheck | Tasks 1-7 |
| 9 | Local dev test | Task 8 |

**Parallelizable:** Tasks 2, 3, 4, 7 can run in parallel after Task 1.
