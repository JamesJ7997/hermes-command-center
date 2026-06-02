"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

// T3: Module-level cache — persists across re-renders, cleared on page reload
const detailCache = new Map<string, TaskDetail>();

interface TaskDetail {
  task: {
    id: string;
    title: string;
    body: string;
    assignee: string;
    status: string;
    created_at: number;
    completed_at: number | null;
    result: string | null;
  };
  children: any[];
  runs: any[];
  comments: any[];
  parents: any[];
  events: any[];
  event_count: number;
  last_event_ts: number | null;
  last_event_kind: string | null;
}

interface LogData {
  log: string | null;
  status: string;
  last_event: any;
  message?: string;
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

// Event kind icons + colors
const EVENT_META: Record<string, { icon: string; color: string }> = {
  created: { icon: "\u{1F4CB}", color: "#71717a" },
  claimed: { icon: "\u{1F44D}", color: "#3b82f6" },
  spawned: { icon: "\u{1F409}", color: "#10b981" },
  heartbeat: { icon: "\u{1F493}", color: "#f59e0b" },
  complete: { icon: "\u{2705}", color: "#10b981" },
  completed: { icon: "\u{2705}", color: "#10b981" },
  failed: { icon: "\u{274C}", color: "#ef4444" },
  blocked: { icon: "\u{1F6AB}", color: "#f59e0b" },
  promoted: { icon: "\u{2B06}\u{FE0F}", color: "#3b82f6" },
};

function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#71717a";
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

function formatTimestamp(ts: number | null): string {
  if (!ts) return "\u2014";
  return new Date(ts * 1000).toLocaleString();
}

function extractDragonName(assignee: string): string {
  // "phoenix-blue-rthar" -> "Blue"
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

export default function TaskDetailModal({
  taskId,
  isSwarmRoot,
  onClose,
}: {
  taskId: string;
  isSwarmRoot: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TaskDetail | null>(
    // T3: Instant render from cache on open
    detailCache.get(taskId) ?? null
  );
  const [loading, setLoading] = useState(!detailCache.has(taskId));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Log state
  const [logData, setLogData] = useState<LogData | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  // T8: Polling state
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastEventCount, setLastEventCount] = useState(
    detail?.event_count ?? 0
  );

  // Fetch detail — always called, returns fresh data
  const fetchDetail = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      const res = await fetch(`/api/swarm/task/${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch task detail");
      const data = await res.json();

      // T3: Update cache
      detailCache.set(taskId, data);
      setDetail(data);
      setLastEventCount(data.event_count ?? 0);
    } catch (err) {
      if (!detail) {
        // Only set error if we have no cached data
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId, detail]);

  // Initial fetch (T3: background re-fetch even if cached)
  useEffect(() => {
    let cancelled = false;
    async function doFetch() {
      try {
        const res = await fetch(`/api/swarm/task/${taskId}`);
        if (!res.ok) throw new Error("Failed to fetch task detail");
        const data = await res.json();
        if (cancelled) return;
        detailCache.set(taskId, data);
        setDetail(data);
        setLastEventCount(data.event_count ?? 0);
      } catch (err) {
        if (!cancelled && !detailCache.has(taskId)) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setRefreshing(false);
      }
    }
    doFetch();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // T8: 2s event polling while modal is open and task is running
  useEffect(() => {
    const activeStatuses = ["running", "ready", "todo", "scheduled"];
    const isActive = detail && activeStatuses.includes(detail.task.status);

    if (isActive) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/swarm/task/${taskId}`);
          if (!res.ok) return;
          const data = await res.json();
          const newCount = data.event_count ?? 0;
          // Only update state if events changed
          if (newCount !== lastEventCount) {
            detailCache.set(taskId, data);
            setDetail(data);
            setLastEventCount(newCount);
          }
        } catch {
          // Silent fail on poll
        }
      }, 2000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [taskId, detail?.task.status, lastEventCount]);

  // Fetch log for running tasks
  const fetchLog = useCallback(async () => {
    if (logLoading) return;
    setLogLoading(true);
    try {
      const res = await fetch(`/api/swarm/task/${taskId}/log`);
      if (!res.ok) throw new Error("Failed to fetch log");
      const data = await res.json();
      setLogData(data);
    } catch {
      setLogData({ log: null, status: "unknown", last_event: null });
    } finally {
      setLogLoading(false);
    }
  }, [taskId, logLoading]);

  // Auto-refresh log every 5s for running tasks
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const isActive = detail?.task.status === "running";
    if (isActive) {
      fetchLog();
      logPollRef.current = setInterval(fetchLog, 5000);
    }
    return () => {
      if (logPollRef.current) {
        clearInterval(logPollRef.current);
        logPollRef.current = null;
      }
    };
  }, [detail?.task.status, fetchLog, logRefreshKey]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Group children by dragon name
  const groupedChildren: Record<string, any[]> = {};
  if (detail?.children) {
    for (const child of detail.children) {
      const dragon = extractDragonName(child.assignee);
      if (!groupedChildren[dragon]) groupedChildren[dragon] = [];
      groupedChildren[dragon].push(child);
    }
  }

  // T7: Format the title
  const displayTitle = detail ? formatWingTitle(detail.task.title) : "";
  // Extract just the action/description part for clean display
  const titleParts = displayTitle.split(": ");
  const cleanTitle =
    titleParts.length > 1
      ? titleParts.slice(1).join(": ")
      : displayTitle;

  const isRunning = detail?.task.status === "running";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header with T5 Refresh button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            {isSwarmRoot && <span className="text-xl">🐉</span>}
            <h2 className="text-lg font-bold text-zinc-100">
              {isSwarmRoot ? "Mission Detail" : "Task Detail"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* T5: Refresh button */}
            <button
              onClick={() => fetchDetail(true)}
              disabled={refreshing}
              className="text-zinc-500 hover:text-zinc-200 transition-colors text-sm leading-none px-2 py-1 rounded hover:bg-zinc-800 disabled:opacity-50"
              title="Refresh (bypass cache)"
            >
              {refreshing ? (
                <span className="animate-spin inline-block">🔄</span>
              ) : (
                "🔄"
              )}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 transition-colors text-xl leading-none px-2"
            >
              {String.fromCharCode(10005)}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {loading && !detail && (
            <div className="text-zinc-500 text-sm animate-pulse">
              Loading task details...
            </div>
          )}
          {error && !detail && (
            <div className="p-4 rounded-lg bg-rose-900/20 border border-rose-800 text-rose-400 text-sm">
              {String.fromCharCode(9888)} {error}
            </div>
          )}
          {detail && (
            <>
              {/* Overview */}
              <section>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Title:</span>{" "}
                    <span className="text-zinc-200 font-medium">
                      {displayTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Status:</span>
                    <StatusDot status={detail.task.status} />
                    <StatusBadge status={detail.task.status} />
                  </div>
                  <div>
                    <span className="text-zinc-500">Assignee:</span>{" "}
                    <span className="text-zinc-200">
                      {detail.task.assignee}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">ID:</span>{" "}
                    <span className="text-zinc-400 font-mono text-xs">
                      {detail.task.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Created:</span>{" "}
                    <span className="text-zinc-400">
                      {formatTimestamp(detail.task.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">Completed:</span>{" "}
                    <span className="text-zinc-400">
                      {formatTimestamp(detail.task.completed_at)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Body/Description */}
              {detail.task.body && (
                <section>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Description
                  </h3>
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 max-h-48 overflow-auto">
                    {detail.task.body}
                  </pre>
                </section>
              )}

              {/* Result */}
              {detail.task.result && (
                <section>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Result
                  </h3>
                  <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono bg-zinc-950/50 rounded-lg p-4 border border-zinc-800 max-h-32 overflow-auto">
                    {detail.task.result}
                  </pre>
                </section>
              )}

              {/* Runs */}
              {detail.runs && detail.runs.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Runs ({detail.runs.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.runs.map((run: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-zinc-400 font-mono text-xs">
                            Run #{i + 1}
                          </span>
                          <span className="text-zinc-600 text-xs">
                            {formatTimestamp(run.started_at)}
                          </span>
                        </div>
                        {run.summary && (
                          <div className="text-zinc-300 text-xs mt-1">
                            {run.summary}
                          </div>
                        )}
                        {run.error && (
                          <div className="text-rose-400 text-xs mt-1">
                            Error: {run.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Children (grouped by dragon) */}
              {isSwarmRoot &&
                detail.children &&
                detail.children.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      Wing Tasks ({detail.children.length})
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(groupedChildren).map(
                        ([dragon, children]) => (
                          <div key={dragon}>
                            <div className="text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
                              <span>{String.fromCharCode(128050)}</span> {dragon}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {children.map((child: any) => (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/70 border border-zinc-700/50"
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
                  </section>
                )}

              {/* Events Timeline */}
              {detail.events && detail.events.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Events ({detail.events.length})
                  </h3>
                  <div className="relative pl-4">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-3 bottom-3 w-px bg-zinc-700" />
                    <div className="space-y-3">
                      {detail.events.map((evt: any, i: number) => {
                        const meta = EVENT_META[evt.kind] ?? {
                          icon: String.fromCharCode(128994),
                          color: "#71717a",
                        };
                        return (
                          <div key={i} className="relative flex items-start gap-3">
                            {/* Timeline dot */}
                            <div
                              className="absolute left-[-14px] top-1 w-3 h-3 rounded-full border-2 border-zinc-600 bg-zinc-900 z-10"
                              style={{ borderColor: meta.color }}
                            />
                            <div className="flex items-center gap-2 text-xs">
                              <span>{meta.icon}</span>
                              <span
                                className="font-semibold uppercase tracking-wider"
                                style={{ color: meta.color }}
                              >
                                {evt.kind}
                              </span>
                              <span className="text-zinc-600">
                                {formatTimestamp(evt.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Live Log — only for running tasks */}
              {isRunning && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Live Log
                    </h3>
                    <button
                      onClick={() => setLogRefreshKey((k) => k + 1)}
                      disabled={logLoading}
                      className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 flex items-center gap-1"
                    >
                      {logLoading ? (
                        <span className="animate-spin inline-block">
                          {String.fromCharCode(128260)}
                        </span>
                      ) : (
                        String.fromCharCode(128260)
                      )}{" "}
                      Refresh
                    </button>
                  </div>
                  <div className="bg-zinc-950/80 rounded-lg border border-zinc-800 max-h-48 overflow-auto">
                    {logData?.message ===
                      "Workspace garbage collected" && (
                      <div className="p-4 text-yellow-600 text-xs">
                        Workspace GC'd — log unavailable. The task's
                        scratch space was reclaimed after completion.
                      </div>
                    )}
                    {logData?.log && (
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap p-4">
                        {logData.log}
                      </pre>
                    )}
                    {logData && !logData.log && !logData.message && (
                      <div className="p-4 text-zinc-600 text-xs italic">
                        (No log content yet — worker may be initializing)
                      </div>
                    )}
                    {!logData && (
                      <div className="p-4 text-zinc-600 text-xs animate-pulse">
                        Fetching log...
                      </div>
                    )}
                  </div>
                  {logData?.last_event && (
                    <div className="mt-2 text-xs text-zinc-600">
                      Last event: {logData.last_event.kind} at{" "}
                      {formatTimestamp(logData.last_event.created_at)}
                    </div>
                  )}
                </section>
              )}

              {/* Comments */}
              {detail.comments && detail.comments.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Comments ({detail.comments.length})
                  </h3>
                  <div className="space-y-2">
                    {detail.comments.map((comment: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 text-sm"
                      >
                        <div className="text-zinc-500 text-xs mb-1">
                          {comment.author ?? "unknown"} {String.fromCharCode(183)}{" "}
                          {formatTimestamp(comment.created_at)}
                        </div>
                        <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-xs">
                          {comment.body}
                        </pre>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
