"use client";

import React, { useEffect, useState, useCallback } from "react";
import { gateway } from "@/lib/gateway";

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
}

interface SwarmQueue {
  active: KanbanTask[];
  queued: KanbanTask[];
  completed: KanbanTask[];
  swarmRoots: KanbanTask[];
  raw: KanbanTask[];
  stats: {
    total: number;
    active: number;
    queued: number;
    completed: number;
  };
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
        v0.1.0-alpha
      </div>
    </header>
  );
}

export default function SwarmPage() {
  const [queue, setQueue] = useState<SwarmQueue>({
    active: [],
    queued: [],
    completed: [],
    swarmRoots: [],
    raw: [],
    stats: { total: 0, active: 0, queued: 0, completed: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLaunch, setShowLaunch] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/swarm/queue");
      if (!res.ok) throw new Error("Failed to fetch queue");
      const data = await res.json();
      setQueue({
        active: data.active ?? [],
        queued: data.queued ?? [],
        completed: data.completed ?? [],
        swarmRoots: data.swarmRoots ?? [],
        raw: data.raw ?? [],
        stats: data.stats ?? { total: 0, active: 0, queued: 0, completed: 0 },
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Swarm Command</h2>
              <p className="text-zinc-400 italic">
                {queue.stats.active > 0
                  ? `${queue.stats.active} task${queue.stats.active > 1 ? "s" : ""} in flight. ${queue.stats.queued} queued.`
                  : "All dragons are in the Weyr. Awaiting orders."}
              </p>
            </div>
            <button
              onClick={() => setShowLaunch(!showLaunch)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <span>🚀</span> Launch Mission
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
              ⚠ {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-zinc-500 text-sm animate-pulse">
              Scanning for active missions...
            </div>
          )}

          {/* Active Swarm Roots */}
          {queue.swarmRoots.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Active Swarms ({queue.swarmRoots.length})
              </h3>
              <div className="flex flex-col gap-4">
                {queue.swarmRoots.map((root) => (
                  <SwarmRootCard key={root.id} root={root} allTasks={queue.raw} />
                ))}
              </div>
            </div>
          )}

          {/* Active Tasks */}
          {queue.active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Active Tasks ({queue.active.length})
              </h3>
              <div className="flex flex-col gap-3">
                {queue.active.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {/* Queued */}
          {queue.queued.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Queued ({queue.queued.length})
              </h3>
              <div className="flex flex-col gap-3">
                {queue.queued.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Completed */}
          {queue.completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Recently Completed ({queue.completed.length})
              </h3>
              <div className="flex flex-col gap-3">
                {queue.completed.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading &&
            queue.active.length === 0 &&
            queue.queued.length === 0 &&
            queue.swarmRoots.length === 0 && (
              <div className="text-center py-16 text-zinc-600">
                <div className="text-4xl mb-4">🐉</div>
                <p className="text-lg font-medium mb-1">No active missions</p>
                <p className="text-sm">
                  Launch a mission to deploy the Phoenix Wing.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function SwarmRootCard({
  root,
  allTasks,
}: {
  root: KanbanTask;
  allTasks: KanbanTask[];
}) {
  const children = allTasks.filter(
    (t) => t.id !== root.id && !t.title.startsWith("Swarm:")
  );

  const statusColor = (status: string) => {
    switch (status) {
      case "running":
        return "#10b981";
      case "ready":
        return "#3b82f6";
      case "todo":
        return "#eab308";
      case "done":
        return "#71717a";
      case "failed":
        return "#ef4444";
      default:
        return "#71717a";
    }
  };

  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐉</span>
          <h4 className="font-bold text-zinc-100">{root.title.replace("Swarm: ", "")}</h4>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor(root.status) }}
          />
          <span className="text-xs font-medium text-zinc-500">{root.status}</span>
        </div>
      </div>
      <div className="text-xs text-zinc-600 mb-3">ID: {root.id}</div>

      {/* Child task pipeline */}
      {children.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {children.map((child, i) => (
            <React.Fragment key={child.id}>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColor(child.status) }}
                />
                <span className="text-xs font-medium text-zinc-300">
                  {child.assignee.split(":")[0]}
                </span>
                <span className="text-xs text-zinc-500">— {child.title}</span>
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${statusColor(child.status)}20`,
                    color: statusColor(child.status),
                  }}
                >
                  {child.status}
                </span>
              </div>
              {i < children.length - 1 && (
                <span className="text-zinc-700 text-xs">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: KanbanTask }) {
  const statusColor = (status: string) => {
    switch (status) {
      case "running":
        return "#10b981";
      case "ready":
        return "#3b82f6";
      case "todo":
        return "#eab308";
      case "done":
        return "#71717a";
      case "failed":
        return "#ef4444";
      default:
        return "#71717a";
    }
  };

  return (
    <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: statusColor(task.status) }}
        />
        <div>
          <div className="text-sm font-medium text-zinc-300">{task.title}</div>
          <div className="text-xs text-zinc-600">
            {task.assignee} · {task.id}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-mono px-2 py-0.5 rounded border"
          style={{
            backgroundColor: `${statusColor(task.status)}15`,
            borderColor: `${statusColor(task.status)}30`,
            color: statusColor(task.status),
          }}
        >
          {task.status}
        </span>
      </div>
    </div>
  );
}

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Mission name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Launch failed");
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

      {error && (
        <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-800 text-emerald-400 text-sm">
          ✅ {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Mission Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., auth-refactor"
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div>
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

        <div>
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

        <div>
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

      <div>
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
              <span className="animate-spin">⟳</span> Launching...
            </>
          ) : (
            <>
              <span>🚀</span> Launch Mission
            </>
          )}
        </button>
      </div>
    </form>
  );
}
