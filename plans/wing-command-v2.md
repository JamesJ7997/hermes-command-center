---
name: wing-command-v2
date: 2026-06-01
status: ready-to-dispatch
---

# Wing Command v2 — Plan

## G — Goal

Redesign Wing Command page so that:
1. Missions (swarm roots) are grouped by status first, then by dragon name within each group
2. Clicking a parent mission opens a detail modal showing full description, all children, log output, results
3. Clicking a child/dragon task opens a detail modal showing that specific task's info
4. Done/failed/blocked missions are NOT shown as "Active"
5. Data source: enhance existing `/api/swarm/task` endpoint to return full task detail (body, result, runs, comments)
6. Terminology: keep "Wing Command" consistently (not "Swarm")

## Current Problems

1. **Done missions show as Active** — API `swarmRoots` filter only excludes `archived`, not `done`. 3 old completed missions clutter the active view.
2. **Missing children** — done children whose workspaces were GC'd still appear as resolved IDs but some task data may be stale. `resolveChildren` works but the children count looks wrong.
3. **No detail drill-down** — clicking a task does nothing. All info is surface-level.
4. **"Active" section is overloaded** — mixes swarm root cards and flat task cards without grouping by dragon.

## V — Invariants

V1. Swarm roots with status `done` or `archived` MUST NOT appear in Active. Only `running`, `ready`, `todo` are active.
V2. Each swarm root groups its children by assignee dragon name (Blue/Gold/White/etc.).
V3. Clicking a parent task (not expander) opens mission-level detail modal.
V4. Clicking a child/child task opens task-level detail modal.
V5. Detail modal shows: title, status, assignee, body/description, result, run summaries with timestamps, comments.
V6. Terminology: "Wing Command" everywhere (nav, page title, headers). No "Swarm" text except in API routes and internal IDs.
V7. Build must pass (`npx tsc --noEmit && npx next build`).
V8. No auto-commit/push.

## Architecture Changes

### API: New `/api/swarm/task/[id]/route.ts`

Currently there's no single-task detail endpoint. Add one:

```
GET /api/swarm/task/[id]
```

Returns full task object from `hermes kanban show <id> --json`, including:
- `task` object (title, body, assignee, status, created_at, completed_at, result)
- `children` array (child task IDs resolved to full task objects from `kanban list`)
- `runs` array (each run: status, summary, error, started_at, ended_at)
- `comments` array
- `parents` array

**Why new endpoint:** The existing `/api/swarm/queue` is a bulk endpoint. A single-task endpoint avoids refetching the whole kanban for modal detail.

### Frontend: Task Detail Modal

Add a `TaskDetailModal` component:
- Receives a `taskId` and optional `isSwarmRoot` flag
- Fetches `/api/swarm/task/[id]`
- Shows tabs or sections:
  - **Overview**: status badge, title, assignee, ID, timestamps
  - **Body/Description**: the `body` text (preformatted, monospace)
  - **Results**: `result` field + each run's summary/error
  - **Children** (if swarm root): nested child cards grouped by dragon name, each clickable
  - **Comments**: comment list
- Close via Escape, click-outside, or X button
- Z-index above everything, dark overlay background

### Frontend: Reorganized Wing Command Page

Layout structure:

```
[Page Header: "Wing Command" + Launch button]

[Status: Active] ← running/ready/todo swarm roots + standalone tasks
  ├── SwarmRootCard (clickable → opens mission modal)
  │     └── Children grouped by Dragon Name
  │           ├── Blue: task card (clickable → opens task modal)
  │           ├── Gold: task card (clickable)
  │           └── White: task card (clickable)
  └── TaskCard (standalone, clickable)

[Status: Queued] ← todo/scheduled tasks
  └── TaskCard per task

[Status: Blocked]
  └── TaskCard per task

[Status: Failed]
  └── TaskCard per task

[Status: Completed] ← done swarm roots + done standalone tasks
  └── SwarmRootCard / TaskCard (clickable)
```

**Key change from current:** `completed` section gets swarm roots too (not just flat children). All sections use the same card components but open detail modals on click.

### Frontend: SwarmRootCard Changes

- Entire card is clickable (cursor: pointer, hover highlight)
- Click → `openModal(taskId, isSwarmRoot=true)`
- Children grouped by dragon name (extract color prefix from assignee: "phoenix-blue-rthar" → "Blue")
- Each child is also clickable → `openModal(childId, isSwarmRoot=false)`
- Chevron/expander for collapsing children section (default: expanded for active, collapsed for completed)

### Frontend: TaskCard Changes

- Clickable (cursor: pointer, hover highlight)
- Click → `openModal(taskId)`

## T — Tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | · | Fix API: exclude `done` from swarmRoots in `/api/swarm/queue/route.ts` | V1 |
| T2 | · | Add new API route `/api/swarm/task/[id]/route.ts` — full task detail | V3,V4,V5 |
| T3 | · | Add `TaskDetailModal` component — Overview/Body/Results/Children/Comments tabs | V3,V4,V5 |
| T4 | · | Make `SwarmRootCard` clickable, add children collapsible section grouped by dragon name | V2,V3 |
| T5 | · | Make `TaskCard` clickable, opens detail modal | V4 |
| T6 | · | Reorganize page layout: Active includes swarm roots + standalone tasks; Completed section includes done swarm roots | V1,V2 |
| T7 | · | Verify "Wing Command" text everywhere, no "Swarm" in UI text | V6 |
| T8 | · | Build verify: `npx tsc --noEmit && npx next build` | V7 |

## Files to Modify

1. `src/app/api/swarm/queue/route.ts` — fix swarmRoots filter (T1)
2. `src/app/api/swarm/task/[id]/route.ts` — new file (T2)
3. `src/app/swarm/page.tsx` — reorganize layout, make cards clickable, add modal state (T3,T4,T5,T6,T7)
4. `src/app/swarm/TaskDetailModal.tsx` — new file (T3)

## Files NOT Modified

- `src/components/Sidebar.tsx` — already says "Wing Command"
- `src/app/layout.tsx` — already says "Hermes Command Center"
- `src/app/api/swarm/launch/route.ts` — no changes needed
- `src/lib/swarm.ts` — types may need extending for runs/comments

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npx next build` passes
- [ ] Active section shows only running/ready/todo missions
- [ ] Completed section shows done swarm roots with all children
- [ ] Clicking mission card opens modal with full description
- [ ] Clicking child card opens modal with that task's detail
- [ ] Modal shows runs with summaries
- [ ] Modal closes on Escape and click-outside
- [ ] No "Swarm" text visible in UI (except maybe page URL `/swarm`)

## Notes

- The `hermes kanban show <id> --json` response structure:
  - Top-level: `{ task: {...}, children: [id,id,...], parents: [...], comments: [...], runs: [...] }`
  - Note: `children` is at top level of response, NOT inside `task` object
  - Child IDs need to be resolved to full task objects via `kanban list`
- Dragon name extraction: split assignee on `-`, take second segment (e.g., "phoenix-blue-rthar" → "blue" → capitalize → "Blue")
