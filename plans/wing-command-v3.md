---
name: wing-command-v3
date: 2026-06-02
status: draft
---

# Wing Command v3 — Plan

## G — Goal

Iterate on Wing Command page based on feedback from v2. Fix task naming, implement parent-level task grouping, add live worker log viewing with refresh, add events tracker, and adopt Pern vernacular for mission titles.

## Current Problems (from user feedback)

1. **Task naming confusion** — White-Nora gets the same "Synthesize swarm outputs" title every time. Child task titles should reflect the parent mission name so you can tell what each task belongs to at a glance.
2. **No parent-level grouping** — Active section shows flat list of swarm roots + standalone tasks. User wants hierarchical: parent mission card with child tasks nested underneath, grouped by status.
3. **Slow modal loading** — Clicking a task takes a couple seconds to load detail. Need caching so repeat views are instant.
4. **No live worker log** — Can't see what a worker is doing while it's running. Log gets GC'd after completion.
5. **No refresh button** — Can't manually refresh a task's log/detail without reloading the whole page.
6. **No events tracker** — Hermes Dashboard shows created/claimed/spawned/heartbeat events. We don't.
7. **"Swarm" in task titles** — User wants Pern vernacular like "Wing Mission" instead of "Swarm" in the title display.

## V — Invariants

V1. Child task titles MUST include the parent mission name (e.g. "Wing Mission: auth-refactor — Synthesize" not just "Synthesize swarm outputs").
V2. Page MUST group tasks under parent mission cards within each status section. Parent card shows mission title, status, child tasks nested below with assignee + status.
V3. Task detail modal MUST load from cache on repeat views (no re-fetch for already-loaded tasks).
V4. Modal MUST show live worker log (run output) for running tasks, with a refresh button.
V5. Modal MUST show events timeline (created, claimed, spawned, heartbeats, completed, failed).
V6. Mission titles MUST use "Wing Mission" prefix instead of "Swarm" in UI display text.
V7. Build must pass (`npx tsc --noEmit && npx next build`).
V8. No auto-commit/push.

## Architecture Changes

### API: Enhance `/api/swarm/task/[id]/route.ts`

Add caching headers and include events:

```
GET /api/swarm/task/[id]
```

Response adds:
- `events` array from `hermes kanban show <id> --json` → `d['events']`
  - Each event: `kind` (created/claimed/spawned/heartbeat/complete/failed), `created_at`, `payload`
- Cache-Control header: `s-maxage=5, stale-while-revalidate=10` (5s browser cache, 10s stale)

### API: New `/api/swarm/task/[id]/log/route.ts`

Stream live worker log for running tasks:

```
GET /api/swarm/task/[id]/log
```

Returns:
- `log` string — the worker log content from kanban workspace (if workspace still exists)
- `status` — current task status
- `last_event` — most recent event timestamp

If workspace already GC'd, returns `{ log: null, message: "Workspace garbage collected" }`

### Frontend: Task Detail Modal — Cache + Refresh + Events

Update `TaskDetailModal.tsx`:

**Cache layer:**
- Module-level `Map<string, TaskDetail>` cache
- On open: check cache first → instant render
- Always re-fetch in background, update cache
- Show stale data immediately while fetching fresh

**Refresh button:**
- Add ↻ button in modal header
- Click → force re-fetch, bypass cache, update display

**Events timeline:**
- New "Events" section in modal
- Show chronological list: created → claimed → spawned → heartbeats → completed/failed
- Each event: timestamp, kind label, icon
- Heartbeat events: show count + last heartbeat time

**Live log section:**
- New "Live Log" section (only for running tasks)
- Fetches `/api/swarm/task/[id]/log`
- Auto-refreshes every 5s while task is running
- Manual refresh button
- Show "Workspace GC'd" message if log unavailable

### Frontend: Page — Parent-Child Grouping

Update `page.tsx` layout within each status group:

```
[Status: Active]
  ├── Wing Mission: auth-refactor (t_XXXXXX) [running]
  │     ├── Blue: wing-command-v2-api [done]
  │     ├── Gold: Verify mission outputs [running] ← LIVE
  │     └── White: Synthesize mission outputs [todo]
  ├── Wing Mission: branding-update (t_YYYYYY) [done]
  │     ├── Blue: branding-update [done]
  │     ├── Gold: Verify mission outputs [done]
  │     └── White: Synthesize mission outputs [done]
  └── Standalone task: some-single-task [ready]

[Status: Completed]
  ├── Wing Mission: debug-achievements-rescan (t_ZZZZZZ) [done]
  │     ├── Blue: debug-achievements-rescan [done]
  │     ├── Gold: Verify mission outputs [done]
  │     └── White: Synthesize mission outputs [done]
```

**Key change:** SwarmRootCard becomes the parent container. Children are always visible underneath (not collapsible anymore — the parent card IS the group). Status section header shows count of parent missions, not total tasks.

### Frontend: Task Title Display

Update title formatting in `SwarmRootCard` and `TaskCard`:

- Root titles: `"Swarm: Implement Swarm UI Restructure: ..."` → `"Wing Mission: Implement Swarm UI Restructure: ..."`
- Child titles: keep as-is but the parent context makes them clear
- In modal header: show `"Wing Mission: <mission-name>"` for roots, plain title for children

### Frontend: Polling Optimization

- Keep 10s poll interval for queue data
- Add 2s poll interval for events on currently open modal (if task is running)
- Stop modal polling when modal closes

## T — Tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | · | Fix task naming: child tasks get parent mission name in title | V1 |
| T2 | · | Implement parent-child grouping on page (parent card = group, children nested) | V2 |
| T3 | · | Add task detail modal cache (Map, instant repeat views) | V3 |
| T4 | · | Add live worker log section to modal + `/api/swarm/task/[id]/log` endpoint | V4 |
| T5 | · | Add refresh button to modal header (force re-fetch) | V4 |
| T6 | · | Add events timeline to modal (created/claimed/spawned/heartbeat/complete) | V5 |
| T7 | · | Replace "Swarm" with "Wing Mission" in UI title display | V6 |
| T8 | · | Add 2s event polling for open modal on running tasks | V3,V4 |
| T9 | · | Build verify: `npx tsc --noEmit && npx next build` | V7 |

## Files to Modify

1. `src/app/api/swarm/task/[id]/route.ts` — add events, cache headers (T5, T6, T8)
2. `src/app/api/swarm/task/[id]/log/route.ts` — new file (T4)
3. `src/app/swarm/TaskDetailModal.tsx` — cache, refresh, events, live log (T3, T4, T5, T6, T8)
4. `src/app/swarm/page.tsx` — parent-child grouping, title formatting (T1, T2, T7)

## Files NOT Modified

- `src/app/api/swarm/queue/route.ts` — no changes needed
- `src/app/api/swarm/launch/route.ts` — no changes needed
- `src/components/Sidebar.tsx` — no changes needed
- `src/app/layout.tsx` — no changes needed

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `npx next build` passes
- [ ] Child task titles include parent mission name
- [ ] Active section groups children under parent mission cards
- [ ] Completed section groups children under parent mission cards
- [ ] Modal loads instantly on repeat views (cache hit)
- [ ] Modal shows events timeline with all event kinds
- [ ] Modal shows live log for running tasks with auto-refresh
- [ ] Refresh button forces re-fetch
- [ ] "Wing Mission" prefix in UI instead of "Swarm"
- [ ] 2s polling for open modal on running tasks
- [ ] No "Swarm" text visible in UI (except API routes)

## Notes

- The `hermes kanban show <id> --json` response includes `events` array with kinds: `created`, `claimed`, `spawned`, `heartbeat`, `protocol_violation`, `gave_up`, `promoted`, `complete`, `failed`
- Worker logs are in the kanban workspace path (from `hermes kanban show` → `task.workspace_path`). Workspace may be GC'd after completion.
- Cache is module-level in the browser (Map), not persisted to localStorage. Cache clears on page reload.
- Title format from kanban: `"Swarm: <action>: <description>"` → display as `"Wing Mission: <action>: <description>"`
