"use client";
import React, { useEffect, useState } from "react";

interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  status: "online" | "offline" | "error";
  capabilities: string[];
}

const INITIAL_SERVERS: MCPServer[] = [
  { id: "m1", name: "Local Filesystem", endpoint: "stdio", status: "online", capabilities: ["read", "write", "search"] },
  { id: "m2", name: "GitHub API", endpoint: "https://api.github.com", status: "online", capabilities: ["repo", "issue", "pr"] },
  { id: "m3", name: "Google Search", endpoint: "http://localhost:3000", status: "error", capabilities: ["search", "extract"] },
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

export default function MCPForge() {
  const servers = INITIAL_SERVERS;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">MCP Forge</h2>
              <p className="text-zinc-400 italic">
                Configure and manage Model Context Protocol servers.
              </p>
            </div>
            <button className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-semibold transition-colors flex items-center gap-2">
              <span>🔌</span> Add Server
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center group hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-zinc-800 text-xl">🛠️</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-100">{server.name}</h3>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          server.status === "online"
                            ? "bg-emerald-500"
                            : server.status === "error"
                              ? "bg-rose-500"
                              : "bg-zinc-600"
                        }`}
                      />
                    </div>
                    <p className="text-xs font-mono text-zinc-500">{server.endpoint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {server.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                  <button className="px-3 py-1 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
                    Manage
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
