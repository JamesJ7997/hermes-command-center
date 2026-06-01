"use client";
import React, { useEffect, useState } from "react";

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  installed: boolean;
  source: "official" | "community" | "local";
}

const INITIAL_SKILLS: Skill[] = [
  { id: "s1", name: "web-search", category: "research", description: "Advanced web browsing and data extraction.", installed: true, source: "official" },
  { id: "s2", name: "github-pr-workflow", category: "devops", description: "Manage PR lifecycles and code reviews.", installed: true, source: "official" },
  { id: "s3", name: "obsidian-vault", category: "knowledge", description: "Direct bidirectional link to Obsidian notes.", installed: false, source: "community" },
  { id: "s4", name: "docker-deploy", category: "devops", description: "Automated containerization and deployment.", installed: false, source: "community" },
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
      <div className="flex items-center gap-4">
        <div className="text-xs text-zinc-500 px-2 py-1 rounded border border-zinc-700">
          v0.1.0-alpha
        </div>
      </div>
    </header>
  );
}

export default function SkillRegistry() {
  const [skills, setSkills] = useState(INITIAL_SKILLS);

  const toggleInstall = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, installed: !s.installed } : s))
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Skill Nexus</h2>
              <p className="text-zinc-400 italic">
                Extend agent capabilities via the global skill registry.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors border border-zinc-700">
                Import from skillsllm.com
              </button>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
                Check for Updates
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex justify-between items-center group hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-zinc-800 text-xl">🧩</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-100">{skill.name}</h3>
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{skill.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleInstall(skill.id)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    skill.installed
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {skill.installed ? "Installed" : "Install"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
