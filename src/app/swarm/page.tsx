"use client";

import React, { useEffect, useState, useCallback } from "react";
import { gateway } from "@/lib/gateway";
import TaskDetailModal from "./TaskDetailModal";

const POLL_INTERVAL = 10_000;

interface KanbanTask {
  id: string;
  title: string;
  body: string;
  assignee: string;
  status: string;
  created_at: number;
  completed_at: number | null;
  result: string | null;
  children?: KanbanTask[];
}

interface SwarmQueue {
  active: KanbanTask[];
  queued: KanbanTask[];
  completed: KanbanTask[];
  failed: KanbanTask[];
  blocked: KanbanTask[];
  swarmRoots: KanbanTask[];
  raw: KanbanTask[];
  stats: {
    total: number;
    active: number;
    queued: number;
    completed: number;
    failed: number;
    blocked: number;
  };
}

const STATUS_COLOR: Record<string, string> = {
  running: "#10b981",
  ready: "#3b82f6",
  todo: "#eab308",
  scheduled: "#eab308",
  done: "#71717a",
  archived: "#71717a",
  failed: "#ef4444",
  blocked: "#f59e0b",
};

function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#71717a";
}

function extractDragonName(assignee: string): string {
  // e.g. "phoenix-blue-rthar" -> "Blue"
  const parts = assignee.split("-");
  if (parts.length >= 2) {
    return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
  }
  return assignee;
}

// T7: Format title - replace "Swarm:" with "Wing Mission:"
function formatWingTitle(title: string): string {
  if (title.startsWith("Swarm:")) {
    return "Wing Mission:" + title.slice(6);
  }
  if (title.startsWith("Mission:")) {
    return "Wing Mission:" + title.slice(8);
  }
  return title;
}

function StatusDot({ status }: { status: string }) {
  return (
    <div
      className="w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: statusColor(status) }}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded border shrink-0"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
        color,
      }}
    >
      {status}
    </span>
  );
}

function PageHeader() {
  const [profile, setProfile] = useState("weyrleader");
  useEffect(() => {
    gateway.getStatus().then((s) => setProfile(s.activeProfile)).catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between px-8 shrink-0">
      <div className="text-sm text-zinc-400">
        Location: <span className="text-zinc-200">Localhost / {profile}</span>
      </div>
      <div className="text-xs text-zinc-500 px-2 py-1 rounded border border-zinc-700">
        v0.3.0-alpha
      </div>
    </header>
  );
}

// ─── Modal context ───────────────────────────────────────────────

let modalOpenHandler: ((taskId: string, isSwarmRoot: boolean) => void) | null =
  null;

function openTaskModal(taskId: string, isSwarmRoot: boolean) {
  modalOpenHandler?.(taskId, isSwarmRoot);
}

// ─── SwarmRootCard (T2: parent-child grouping) ───────────────────

function SwarmRootCard({ root }: { root: KanbanTask }) {
  const children = root.children ?? [];
  const [expanded, setExpanded] = useState(
    root.status === "running" || root.status === "ready" || root.status === "todo"
  );

  // Group children by dragon name
  const childrenByDragon = new Map<string, KanbanTask[]>();
  for (const child of children) {
    const dragon = extractDragonName(child.assignee);
    if (!childrenByDragon.has(dragon)) childrenByDragon.set(dragon, []);
    childrenByDragon.get(dragon)!.push(child);
  }

  // T7: Format the title
  const displayTitle = formatWingTitle(root.title);

  return (
    <div className="space-y-3">
      {/* Parent card — the group container */}
      <div
        className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors"
        onClick={() => openTaskModal(root.id, true)}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{String.fromCharCode(128009)}</span>
            <h4 className="font-bold text-zinc-100">{displayTitle}</h4>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot status={root.status} />
            <span className="text-xs font-medium text-zinc-500">
              {root.status}
            </span>
          </div>
        </div>
        <div className="text-xs text-zinc-600 mb-3">ID: {root.id}</div>
      </div>

      {/* T2: Children always visible underneath the parent card */}
      {children.length > 0 && (
        <div className="ml-6 pl-4 border-l-2 border-zinc-700/50">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          >
            <span
              className="inline-block transition-transform"
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              {String.fromCharCode(9654)}
            </span>{" "}
            {children.length} Wing Task{children.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <div className="flex flex-col gap-2">
              {Array.from(childrenByDragon.entries()).map(
                ([dragon, dragonChildren]) => (
                  <div key={dragon}>
                    <div className="text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                      <span>{String.fromCharCode(128009)}</span> {dragon}
                    </div>
                    <div className="flex flex-col gap-1.5 pl-3">
                      {dragonChildren.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50 cursor-pointer hover:border-zinc-500 transition-colors"
                          onClick={() => openTaskModal(child.id, false)}
                        >
                          <StatusDot status={child.status} />
                          <span className="text-xs font-medium text-zinc-300">
                            {child.title}
                          </span>
                          <StatusBadge status={child.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────

function TaskCard({ task }: { task: KanbanTask }) {
  return (
    <div
      className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 flex justify-between items-center cursor-pointer hover:border-zinc-600 transition-colors"
      onClick={() => openTaskModal(task.id, false)}
    >
      <div className="flex items-center gap-3">
        <StatusDot status={task.status} />
        <div className="flex flex-col">
          <div className="text-sm font-medium text-zinc-300">{task.title}</div>
          <div className="text-xs text-zinc-600">
            {task.assignee} {String.fromCharCode(183)} {task.id}
          </div>
        </div>
      </div>
      <StatusBadge status={task.status} />
    </div>
  );
}

// ─── StatusGroup ─────────────────────────────────────────────────

function StatusGroup({
  label,
  color,
  count,
  children,
}: {
  label: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          {label} ({count})
        </h3>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

// ─── LaunchForm (unchanged) ──────────────────────────────────────

function LaunchForm({
  onLaunch,
  onCancel,
}: {
  onLaunch: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [wing, setWing] = useState("Phoenix");
  const [type, setType] = useState("build");
  const [mode, setMode] = useState<"bg" | "fg">("bg");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Mission name is required");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/swarm/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          wing,
          type,
          mode,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to launch");
      }

      const data = await res.json();
      setSuccess(`Mission launched: ${data.id} (${data.totalTasks} tasks)`);
      setTimeout(onLaunch, 2000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4"
    >
      <h3 className="text-lg font-bold text-zinc-100">Launch New Mission</h3>

      {formError && (
        <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800 text-rose-400 text-sm">
          {formError}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-800 text-emerald-400 text-sm">
          {String.fromCharCode(9989)} {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Mission Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. auth-refactor"
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Wing
          </label>
          <select
            value={wing}
            onChange={(e) => setWing(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="Phoenix">Phoenix</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="build">Build</option>
            <option value="explore">Explore</option>
            <option value="review">Review</option>
            <option value="full">Full Pipeline</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Execution Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "bg" | "fg")}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500"
          >
            <option value="bg">Background (keep talking)</option>
            <option value="fg">Foreground (wait for results)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="block text-xs font-medium text-zinc-500 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the mission..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin">{String.fromCharCode(10227)}</span>{" "}
              Launching...
            </>
          ) : (
            <>
              <span>{String.fromCharCode(128640)}</span> Launch Mission
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────

export default function SwarmPage() {
  const [queue, setQueue] = useState<SwarmQueue>({
    active: [],
    queued: [],
    completed: [],
    failed: [],
    blocked: [],
    swarmRoots: [],
    raw: [],
    stats: { total: 0, active: 0, queued: 0, completed: 0, failed: 0, blocked: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLaunch, setShowLaunch] = useState(false);

  // Modal state
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [modalIsSwarmRoot, setModalIsSwarmRoot] = useState(false);

  // Register the modal handler
  useEffect(() => {
    modalOpenHandler = (taskId: string, isSwarmRoot: boolean) => {
      setModalTaskId(taskId);
      setModalIsSwarmRoot(isSwarmRoot);
    };
    return () => {
      modalOpenHandler = null;
    };
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/swarm/queue");
      if (!res.ok) throw new Error("Failed to fetch queue");
      const data = await res.json();
      setQueue({
        active: data.active ?? [],
        queued: data.queued ?? [],
        completed: data.completed ?? [],
        failed: data.failed ?? [],
        blocked: data.blocked ?? [],
        swarmRoots: data.swarmRoots ?? [],
        raw: data.raw ?? [],
        stats: data.stats ?? { total: 0, active: 0, queued: 0, completed: 0, failed: 0, blocked: 0 },
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // T2: Separate active swarm roots from completed swarm roots
  // Active = running/ready/todo swarm roots (done/archived filtered by API)
  const activeSwarmRoots = queue.swarmRoots.filter(
    (r) => r.status === "running" || r.status === "ready" || r.status === "todo"
  );
  const completedSwarmRoots = queue.swarmRoots.filter(
    (r) => r.status === "done" || r.status === "archived"
  );

  // T2: Status count shows parent missions, not total children
  const activeMissionCount = activeSwarmRoots.length;
  const completedMissionCount = completedSwarmRoots.length;

  // Standalone active tasks (not children of swarm roots)
  const activeStandalone = queue.active;
  const completedStandalone = queue.completed;

  const showEmpty =
    !loading &&
    activeSwarmRoots.length === 0 &&
    activeStandalone.length === 0 &&
    queue.queued.length === 0 &&
    queue.failed.length === 0 &&
    queue.blocked.length === 0 &&
    completedSwarmRoots.length === 0 &&
    completedStandalone.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page title + Launch button */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-3xl font-bold mb-2">Wing Command</h2>
              <p className="text-zinc-400 italic">
                {queue.stats.active > 0
                  ? `${activeMissionCount} mission${activeMissionCount !== 1 ? "s" : ""} in flight. ${queue.stats.queued} queued.`
                  : "All dragons are in the Weyr. Awaiting orders."}
              </p>
            </div>
            <button
              onClick={() => setShowLaunch(!showLaunch)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>{String.fromCharCode(128640)}</span> Launch Mission
            </button>
          </div>

          {/* Launch Form */}
          {showLaunch && (
            <LaunchForm
              onLaunch={() => {
                setShowLaunch(false);
                fetchQueue();
              }}
              onCancel={() => setShowLaunch(false)}
            />
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-900/20 border border-rose-800 text-rose-400 text-sm">
              {String.fromCharCode(9888)} {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-zinc-500 text-sm animate-pulse">
              Scanning for active missions...
            </div>
          )}

          {/* === STATUS GROUP: ACTIVE === */}
          {(activeSwarmRoots.length > 0 || activeStandalone.length > 0) && (
            <StatusGroup
              label="Active"
              color="#10b981"
              count={activeMissionCount + activeStandalone.length}
            >
              {activeSwarmRoots.map((root) => (
                <SwarmRootCard key={root.id} root={root} />
              ))}
              {activeStandalone.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </StatusGroup>
          )}

          {/* === STATUS GROUP: QUEUED === */}
          {queue.queued.length > 0 && (
            <StatusGroup
              label="Queued"
              color="#eab308"
              count={queue.queued.length}
            >
              {queue.queued.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </StatusGroup>
          )}

          {/* === STATUS GROUP: BLOCKED === */}
          {queue.blocked.length > 0 && (
            <StatusGroup
              label="Blocked"
              color="#f59e0b"
              count={queue.blocked.length}
            >
              {queue.blocked.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </StatusGroup>
          )}

          {/* === STATUS GROUP: FAILED === */}
          {queue.failed.length > 0 && (
            <StatusGroup
              label="Failed"
              color="#ef4444"
              count={queue.failed.length}
            >
              {queue.failed.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </StatusGroup>
          )}

          {/* === STATUS GROUP: COMPLETED === */}
          {(completedSwarmRoots.length > 0 || completedStandalone.length > 0) && (
            <StatusGroup
              label="Completed"
              color="#71717a"
              count={completedMissionCount + completedStandalone.length}
            >
              {completedSwarmRoots.map((root) => (
                <SwarmRootCard key={root.id} root={root} />
              ))}
              {completedStandalone.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </StatusGroup>
          )}

          {/* Empty state */}
          {showEmpty && (
            <div className="text-center py-16 text-zinc-600">
              <div className="text-4xl mb-4">{String.fromCharCode(128009)}</div>
              <p className="text-lg">No active missions.</p>
              <p className="text-sm">
                Launch a new mission to get your Wing in the air.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {modalTaskId && (
        <TaskDetailModal
          taskId={modalTaskId}
          isSwarmRoot={modalIsSwarmRoot}
          onClose={() => setModalTaskId(null)}
        />
      )}
    </div>
  );
}
