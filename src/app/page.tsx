"use client";
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { gateway, DashboardMetrics } from "@/lib/gateway";

const MOCK_TRENDS = [
  { name: "Turn 1", tokens: 4000, calls: 24 },
  { name: "Turn 2", tokens: 3000, calls: 18 },
  { name: "Turn 3", tokens: 2000, calls: 94 },
  { name: "Turn 4", tokens: 2780, calls: 39 },
  { name: "Turn 5", tokens: 1890, calls: 48 },
  { name: "Turn 6", tokens: 3420, calls: 41 },
  { name: "Turn 7", tokens: 3490, calls: 43 },
];

export default function Home() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeSessions: 0,
    totalTokens: 0,
    apiCalls: 0,
    activeModel: "loading",
  });
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState("weyrleader");

  useEffect(() => {
    async function sync() {
      try {
        const s = await gateway.getStatus();
        setConnected(s.connected);
        setProfile(s.activeProfile);
      } catch { /* ignore */ }
      try {
        const m = await gateway.getMetrics();
        setMetrics(m);
      } catch { /* ignore */ }
    }
    sync();
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 flex items-center justify-between px-8 shrink-0">
        <div className="text-sm text-zinc-400">
          Location: <span className="text-zinc-200">Localhost / {profile}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-zinc-500 px-2 py-1 rounded border border-zinc-700">
            v0.1.0-alpha
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome, Weyrleader.</h2>
              <p className="text-zinc-400 italic">
                {connected
                  ? "Sectors operational. All dragons are in the Weyr."
                  : "Critical: Gateway link failed. Seek immediate repair."}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">
                Active Model
              </div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {metrics.activeModel}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Active Sessions"
              value={metrics.activeSessions.toString()}
              change="+1"
            />
            <StatsCard
              title="Total Tokens"
              value={metrics.totalTokens.toLocaleString()}
              change="-2%"
            />
            <StatsCard
              title="API Calls"
              value={metrics.apiCalls.toLocaleString()}
              change="+15%"
            />
          </div>

          {/* Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">
                Token Usage Trend
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_TRENDS}>
                    <defs>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#10b981" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tokens"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorTokens)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">
                API Call Volume
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="calls"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  change,
}: {
  title: string;
  value: string;
  change: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
      <div className="text-sm text-zinc-500 mb-1">{title}</div>
      <div className="text-2xl font-bold mb-2">{value}</div>
      <div
        className={`text-xs ${change.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}
      >
        {change} from last Turn
      </div>
    </div>
  );
}
