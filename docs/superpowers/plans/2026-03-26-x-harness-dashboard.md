# X Harness Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the X Harness admin dashboard — same design as LINE Harness, with a platform switcher for future "The Harness" unification.

**Architecture:** Next.js 15 static export with Tailwind CSS 4, calling X Harness Workers API via Bearer auth. Sidebar has a platform switcher (X Harness / LINE Harness) that changes the active API URL and sidebar menu. All patterns (auth, layout, API client, forms, tables) mirror LINE Harness exactly.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, TypeScript 5

---

## Design Decisions

- **Brand color:** `#1D9BF0` (X Blue) replaces `#06C755` (LINE Green)
- **Platform switcher:** Top of sidebar, toggles between X Harness and LINE Harness dashboards (URL redirect)
- **Pages (MVP):** Dashboard, Engagement Gates, Followers, Tags, Scheduled Posts, X Accounts, Login
- **Static export:** `output: 'export'` — deploy to CF Pages or Vercel
- **API auth:** Same pattern as LINE Harness — localStorage key, AuthGuard

## File Structure

```
apps/web/
├── package.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (Noto Sans JP, bg-gray-50)
│   │   ├── page.tsx                      # Dashboard (stat cards)
│   │   ├── login/page.tsx                # API key login
│   │   ├── engagement-gates/page.tsx     # Gate CRUD + delivery history
│   │   ├── followers/page.tsx            # Follower table + tag filter
│   │   ├── tags/page.tsx                 # Tag CRUD
│   │   ├── scheduled-posts/page.tsx      # Scheduled post management
│   │   └── accounts/page.tsx             # X account management
│   ├── components/
│   │   ├── app-shell.tsx                 # Sidebar + main wrapper
│   │   ├── auth-guard.tsx                # localStorage key check
│   │   └── layout/
│   │       ├── sidebar.tsx               # Navigation + platform switcher
│   │       └── header.tsx                # Page title + action button
│   ├── contexts/
│   │   └── account-context.tsx           # X account switcher state
│   ├── lib/
│   │   └── api.ts                        # API client (fetch wrapper + all endpoints)
│   └── globals.css                       # Tailwind imports
```

---

## Task 1: Project Setup

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/tsconfig.json`, `apps/web/src/globals.css`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 3: Create postcss.config.mjs**

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create src/globals.css**

```css
@import "tailwindcss";
```

- [ ] **Step 6: Install and verify**

```bash
cd /Users/axpr/claudecode/tools/x-harness && pnpm install && cd apps/web && npx next build
```

- [ ] **Step 7: Commit**

```bash
git add apps/web && git commit -m "chore: scaffold Next.js dashboard"
```

---

## Task 2: API Client

**Files:**
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Create api.ts**

The API client mirrors LINE Harness's pattern exactly — localStorage key, Bearer auth, typed fetch wrapper.

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('xh_api_key') || process.env.NEXT_PUBLIC_API_KEY || '';
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
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

// --- Types ---

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
  lineHarnessTag: string | null;
  lineHarnessScenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
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
  metadata: Record<string, unknown>;
  createdAt: string;
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

export interface XAccount {
  id: string;
  xUserId: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
}

// --- API ---

export const api = {
  health: () => fetchApi<ApiResponse<{ status: string }>>('/api/health'),

  engagementGates: {
    list: () => fetchApi<ApiResponse<EngagementGate[]>>('/api/engagement-gates'),
    get: (id: string) => fetchApi<ApiResponse<EngagementGate>>(`/api/engagement-gates/${id}`),
    create: (data: Partial<EngagementGate>) =>
      fetchApi<ApiResponse<EngagementGate>>('/api/engagement-gates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<EngagementGate>) =>
      fetchApi<ApiResponse<EngagementGate>>(`/api/engagement-gates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<ApiResponse<void>>(`/api/engagement-gates/${id}`, { method: 'DELETE' }),
    deliveries: (id: string, limit = 50, offset = 0) =>
      fetchApi<ApiResponse<Delivery[]>>(`/api/engagement-gates/${id}/deliveries?limit=${limit}&offset=${offset}`),
  },

  followers: {
    list: (params?: { limit?: number; offset?: number; tagId?: string }) => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      if (params?.tagId) qs.set('tagId', params.tagId);
      return fetchApi<ApiResponse<PaginatedData<Follower>>>(`/api/followers?${qs}`);
    },
    get: (id: string) => fetchApi<ApiResponse<Follower>>(`/api/followers/${id}`),
    addTag: (id: string, tagId: string) =>
      fetchApi<ApiResponse<void>>(`/api/followers/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagId }) }),
    removeTag: (id: string, tagId: string) =>
      fetchApi<ApiResponse<void>>(`/api/followers/${id}/tags/${tagId}`, { method: 'DELETE' }),
  },

  tags: {
    list: () => fetchApi<ApiResponse<Tag[]>>('/api/tags'),
    create: (xAccountId: string, name: string, color?: string) =>
      fetchApi<ApiResponse<Tag>>('/api/tags', { method: 'POST', body: JSON.stringify({ xAccountId, name, color }) }),
    update: (id: string, data: { name?: string; color?: string }) =>
      fetchApi<ApiResponse<Tag>>(`/api/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<ApiResponse<void>>(`/api/tags/${id}`, { method: 'DELETE' }),
  },

  posts: {
    schedule: (data: { xAccountId: string; text: string; scheduledAt: string }) =>
      fetchApi<ApiResponse<ScheduledPost>>('/api/posts/schedule', { method: 'POST', body: JSON.stringify(data) }),
    listScheduled: () => fetchApi<ApiResponse<ScheduledPost[]>>('/api/posts/scheduled'),
    cancel: (id: string) => fetchApi<ApiResponse<void>>(`/api/posts/scheduled/${id}`, { method: 'DELETE' }),
  },

  accounts: {
    list: () => fetchApi<ApiResponse<XAccount[]>>('/api/x-accounts'),
    create: (data: { xUserId: string; username: string; accessToken: string; refreshToken?: string }) =>
      fetchApi<ApiResponse<XAccount>>('/api/x-accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { accessToken?: string; isActive?: boolean }) =>
      fetchApi<ApiResponse<void>>(`/api/x-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib && git commit -m "feat: add API client for dashboard"
```

---

## Task 3: Layout Components (Sidebar + Header + AuthGuard + AppShell)

**Files:**
- Create: `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/header.tsx`, `apps/web/src/components/auth-guard.tsx`, `apps/web/src/components/app-shell.tsx`, `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Create sidebar.tsx**

The sidebar has:
- Platform switcher at top (X Harness / LINE Harness) with URL redirect
- Navigation sections: Main, Engagement, Settings
- Brand color: `#1D9BF0` (X Blue)
- Mobile hamburger + slide-in panel (same as LINE Harness)

Key sections:
1. **Main**: Dashboard, Followers
2. **Engagement**: Engagement Gates, Scheduled Posts
3. **管理**: Tags, X Accounts

Platform switcher: dropdown showing "X Harness" (active, blue) and "LINE Harness" (link to LINE Harness dashboard URL from env var `NEXT_PUBLIC_LINE_HARNESS_URL`).

Exact implementation: Copy LINE Harness sidebar structure, replace:
- `#06C755` → `#1D9BF0`
- LINE menu items → X Harness menu items
- Account switcher → Platform switcher
- `lh_` localStorage prefix → `xh_`

- [ ] **Step 2: Create header.tsx**

Same as LINE Harness — title + optional action button + description.

- [ ] **Step 3: Create auth-guard.tsx**

Same as LINE Harness — check `localStorage.xh_api_key`, redirect to `/login`.

- [ ] **Step 4: Create app-shell.tsx**

Same as LINE Harness — Sidebar + main flex layout, wraps children with AuthGuard.

- [ ] **Step 5: Create layout.tsx**

Root layout with Noto Sans JP font, `bg-gray-50`, `lang="ja"`.

- [ ] **Step 6: Verify build**

```bash
cd /Users/axpr/claudecode/tools/x-harness/apps/web && npx next build
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src && git commit -m "feat: add layout components with platform switcher"
```

---

## Task 4: Login Page

**Files:**
- Create: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

Same pattern as LINE Harness:
- X Blue (`#1D9BF0`) background
- White centered card
- API key input (password type)
- Validates by calling `api.health()`
- Stores in `localStorage.xh_api_key`
- Redirects to `/`

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/login && git commit -m "feat: add login page"
```

---

## Task 5: Dashboard Page

**Files:**
- Create: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Create dashboard**

4 stat cards:
1. Engagement Gates (active count)
2. Followers (total count)
3. Tags (count)
4. Scheduled Posts (pending count)

Each card: icon + title + large number, `bg-white rounded-lg shadow-sm border border-gray-200 p-6`.
Quick action links to each section.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/page.tsx && git commit -m "feat: add dashboard page with stat cards"
```

---

## Task 6: Engagement Gates Page

**Files:**
- Create: `apps/web/src/app/engagement-gates/page.tsx`

- [ ] **Step 1: Create engagement gates page**

This is the killer feature page — needs:
- Header with "+ New Gate" button
- Create form (toggleable): postId, triggerType (like/repost), template, link, LINE Harness fields
- Gate list as cards (grid-cols-1 md:grid-cols-2)
- Each card shows: Post ID, trigger type, template preview, active badge, delivery count
- Expand to see delivery history table
- Enable/disable toggle, edit, delete buttons

Card layout:
```
┌─────────────────────────────────┐
│ Post: 1234567890     ● Active   │
│ Trigger: いいね                  │
│ Template: 特典はこちら→ {link}   │
│ Deliveries: 42 delivered         │
│ [Edit] [Disable] [Delete]        │
└─────────────────────────────────┘
```

Delivery history table (expandable):
```
| Username | Status    | Date       |
|----------|-----------|------------|
| @tanaka  | delivered | 2026-03-26 |
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/engagement-gates && git commit -m "feat: add engagement gates page with delivery history"
```

---

## Task 7: Followers Page

**Files:**
- Create: `apps/web/src/app/followers/page.tsx`

- [ ] **Step 1: Create followers page**

Same pattern as LINE Harness friends page:
- Tag filter dropdown
- Paginated table (20 per page)
- Columns: Avatar/Username | Display Name | Followers | Following | Tags | First Seen
- Expandable rows with tag management (add/remove)
- Previous/Next pagination

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/followers && git commit -m "feat: add followers page with tag management"
```

---

## Task 8: Tags + Scheduled Posts + Accounts Pages

**Files:**
- Create: `apps/web/src/app/tags/page.tsx`, `apps/web/src/app/scheduled-posts/page.tsx`, `apps/web/src/app/accounts/page.tsx`

- [ ] **Step 1: Create tags page**

Simple CRUD: create form (name + color picker), list with edit/delete.

- [ ] **Step 2: Create scheduled posts page**

Create form (text + scheduledAt datetime picker), list with status badge + cancel button.

- [ ] **Step 3: Create accounts page**

List accounts, add new (xUserId, username, accessToken), enable/disable toggle.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/tags apps/web/src/app/scheduled-posts apps/web/src/app/accounts && git commit -m "feat: add tags, scheduled posts, and accounts pages"
```

---

## Task 9: Build + Deploy

- [ ] **Step 1: Verify full build**

```bash
cd /Users/axpr/claudecode/tools/x-harness/apps/web && npx next build
```

- [ ] **Step 2: Deploy Worker API to Cloudflare**

```bash
cd /Users/axpr/claudecode/tools/x-harness/apps/worker && npx wrangler secret put API_KEY && npx wrangler deploy
```

- [ ] **Step 3: Deploy dashboard to CF Pages**

```bash
cd /Users/axpr/claudecode/tools/x-harness/apps/web && npx wrangler pages project create x-harness-web && npx wrangler pages deploy out
```

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "chore: build and deploy verification"
```

---

## Task Summary

| Task | Description | Effort |
|------|-------------|--------|
| 1 | Project setup (Next.js + Tailwind) | Small |
| 2 | API client | Small |
| 3 | Layout (Sidebar + Platform Switcher + Header + Auth) | Medium |
| 4 | Login page | Small |
| 5 | Dashboard (stat cards) | Small |
| 6 | Engagement Gates page (killer feature) | Large |
| 7 | Followers page (table + tags) | Medium |
| 8 | Tags + Scheduled Posts + Accounts pages | Medium |
| 9 | Build + Deploy | Small |

**Parallelizable:** Tasks 4, 5 can run after Task 3. Tasks 6, 7, 8 can run in parallel after Task 2.
