---
name: swarm-ui-restructure
date: 2026-06-01
status: draft
---

# Swarm UI Restructure Spec

## G — goal

Redesign Swarm Command page to show missions grouped by status, with child tasks nested under each mission. Fix bugs: done missions showing as active, children assigned to wrong parent.

## C — constraints

- Keep Gateway Kanban (`hermes kanban swarm/list/show`) as dispatch engine — no changes to swarm logic
- API route `/api/swarm/queue` is the single data source
- Frontend is React/Next.js (App Router), Tailwind CSS, client-side polling
- Obsidian brain integration: mission logs copied to `Work/Missions/<wing>/<name>-YYYYMMDD/`
- Build must pass (`npx tsc --noEmit && npx next build`)
- No auto-commit/push after spec — user invokes build explicitly

## I — interfaces

- `GET /api/swarm/queue` → returns active/queued/completed/swarmRoots/stats
- `POST /api/swarm/launch` → creates swarm via `hermes kanban swarm --json`
- Frontend polls `/api/swarm/queue` every 10s
- Hermes Gateway provides `hermes kanban show <id> --json` with `children` array

## V — invariants

V1. Every swarm root task returned by `/api/swarm/queue` MUST include its `children` array from Kanban API.
V2. Child tasks MUST be nested under their parent swarm root, not assigned by title-prefix filtering.
V3. Swarm roots with status `done` MUST NOT appear in the Active section.
V4. Missions MUST be grouped by status: Active (running/ready/todo), Completed (done), Failed, Blocked.
V5. Each child task display MUST show: assignee name, title, status badge.
V6. Nav label and page title MUST use "Wing Command" / "Mission" terminology (not "Swarm").

## T — tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | . | Rename nav "Swarm / Kanban" → "Wing Command", page title "Swarm Command" → "Wing Command" | V6 |
| T2 | . | Fix `/api/swarm/queue` to fetch `children` array for each swarm root via `hermes kanban show <root_id> --json` | V1 |
| T3 | . | Fix `SwarmRootCard` to use actual `children` array instead of title-prefix filtering | V2 |
| T4 | . | Fix active filter: exclude `done` status from Active section | V3 |
| T5 | . | Restructure page layout: group missions by status (Active/Completed/Failed/Blocked), nest children under mission | V4,V5 |
| T6 | . | Build and verify (`npx tsc --noEmit && npx next build`) | — |

## B — bugs

| id | date | cause | fix |
|----|------|-------|-----|
| B1 | 2026-06-01 | SwarmRootCard filters children by `!t.title.startsWith("Swarm:")` — grabs ALL non-root tasks regardless of actual parent | T3: use `children` array from Kanban API |
| B2 | 2026-06-01 | Active section filter excludes only `archived` status, not `done` — completed missions show as active | T4: exclude `done` from Active |
