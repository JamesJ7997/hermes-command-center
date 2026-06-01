"use client";
import React, { useEffect, useState } from "react";

interface Profile {
  id: string;
  name: string;
  model: string;
  description: string;
  active: boolean;
}

const INITIAL_PROFILES: Profile[] = [
  { id: "p1", name: "Default", model: "gemma4:31b", description: "Balanced general purpose agent.", active: true },
  { id: "p2", name: "Researcher", model: "claude-3-5-sonnet", description: "Optimized for deep analysis and coding.", active: false },
  { id: "p3", name: "Creative", model: "gpt-4o", description: "Focus on imaginative content and design.", active: false },
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

export default function ProfileRoster() {
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);

  const toggleActive = (id: string) => {
    setProfiles((prev) =>
      prev.map((p) => ({
        ...p,
        active: p.id === id ? true : false,
      }))
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Profile Roster</h2>
              <p className="text-zinc-400 italic">
                Switch between agent personalities and model configurations.
              </p>
            </div>
            <button className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg font-semibold transition-colors flex items-center gap-2">
              <span>➕</span> Create New Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`p-6 rounded-2xl border transition-all cursor-pointer relative group ${
                  profile.active
                    ? "bg-zinc-900 border-emerald-500 shadow-lg ring-1 ring-emerald-500"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"
                }`}
                onClick={() => toggleActive(profile.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-2xl">👤</div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      profile.active
                        ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                        : "bg-zinc-700"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-bold mb-1">{profile.name}</h3>
                <div className="text-xs font-mono text-emerald-400 mb-3 bg-emerald-900/20 px-2 py-0.5 rounded w-fit border border-emerald-800/50">
                  {profile.model}
                </div>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  {profile.description}
                </p>
                <div className="flex justify-end">
                  <button
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                      profile.active
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {profile.active ? "Active" : "Activate"}
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
