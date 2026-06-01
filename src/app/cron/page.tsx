"use client";
import React, { useEffect, useState } from "react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  status: "active" | "paused" | "error";
}

const INITIAL_CRONS: CronJob[] = [
  { id: "c1", name: "Daily Vault Cleanup", schedule: "0 0 * * *", lastRun: "2026-05-28 00:00", status: "active" },
  { id: "c2", name: "Weekly Project Audit", schedule: "0 0 * * 0", lastRun: "2026-05-22 00:00", status: "paused" },
  { id: "c3", name: "API Token Rotation", schedule: "0 0 1 * *", lastRun: "2026-05-01 00:00", status: "error" },
];

function PageHeader() {
  const [profile, setProfile] = useState("weyrleader");
  useEffect(() => {
    import("@/lib/gateway").then(({ gateway }) => {
      gateway.getStatus().then((s) => setProfile(s.activeProfile)).catch(() => {});
    });
  }, []);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between px-8 shrink-0">
      <div className="text-sm text-zinc-400">
        Location: <span className="text-zinc-200">Localhost / {profile}</span>
      </div>
      <div className="text-xs text-zinc-500 px-2 py-1 rounded border border-zinc-700">v0.1.0-alpha</div>
    </header>
  );
}

export default function Chronos() {
  const [crons, setCrons] = useState(INITIAL_CRONS);

  const toggleStatus = (id: string) => {
    setCrons((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "active" ? "paused" : "active" }
          : c
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Chronos</h2>
              <p className="text-zinc-400 italic">
                Scheduled autonomous operations and recurring tasks.
              </p>
            </div>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
              <span>⏰</span> Schedule Job
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {crons.map((cron) => (
              <div
                key={cron.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center group hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-zinc-800 text-xl">🕒</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-100">{cron.name}</h3>
                      <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        {cron.schedule}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">Last run: {cron.lastRun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`text-xs font-medium ${
                      cron.status === "active"
                        ? "text-emerald-400"
                        : cron.status === "error"
                          ? "text-rose-400"
                          : "text-zinc-500"
                    }`}
                  >
                    {cron.status}
                  </div>
                  <button
                    onClick={() => toggleStatus(cron.id)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      cron.status === "active"
                        ? "bg-rose-900/30 text-rose-400 hover:bg-rose-900/50"
                        : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                    }`}
                  >
                    {cron.status === "active" ? "Pause" : "Resume"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
