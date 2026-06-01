"use client";
import React, { useEffect, useState } from "react";

interface VaultNote {
  id: string;
  title: string;
  lastModified: string;
  tags: string[];
  preview: string;
}

const MOCK_NOTES: VaultNote[] = [
  { id: "1", title: "System/Assistant/context.md", lastModified: "2026-05-28", tags: ["system", "core"], preview: "Operations, health, and family overview settings." },
  { id: "2", title: "Career/Baselines.md", lastModified: "2026-05-20", tags: ["career", "baseline"], preview: "Baseline metrics for Data Engineering roles." },
  { id: "3", title: "Growth/Paths/Analytics.md", lastModified: "2026-05-15", tags: ["growth", "learning"], preview: "Pathways for mastering Medallion architecture." },
  { id: "4", title: "PROJECTS/TaxOps-Atlas/SPEC.md", lastModified: "2026-05-27", tags: ["project", "spec"], preview: "Data pipeline specification for TaxOps Atlas." },
  { id: "5", title: "Daily/2026-05-29.md", lastModified: "2026-05-29", tags: ["daily"], preview: "Today is a good day to build a command center." },
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

export default function VaultBrowser() {
  const [selectedNote, setSelectedNote] = useState<VaultNote | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = MOCK_NOTES.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader />
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6 h-full flex flex-col">
          <div className="flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-3xl font-bold mb-2">Vault Browser</h2>
              <p className="text-zinc-400 italic">
                Access and explore the Obsidian knowledge base.
              </p>
            </div>
            <div className="text-sm text-zinc-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Synced with /OneDrive/Documents/Obsidian Vault/
            </div>
          </div>

          <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
            <div className="w-80 flex flex-col gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shrink-0">
              <div className="p-4 border-b border-zinc-800">
                <input
                  type="text"
                  placeholder="Search vault..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedNote?.id === note.id
                        ? "bg-emerald-900/20 border border-emerald-800/50 text-zinc-100"
                        : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{note.title}</div>
                    <div className="text-[10px] text-zinc-600 mt-1">{note.lastModified}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-auto p-8 shadow-inner">
              {selectedNote ? (
                <div className="max-w-3xl mx-auto">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-bold">{selectedNote.title}</h3>
                    <div className="flex gap-2">
                      {selectedNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {`# ${selectedNote.title}\n\n${selectedNote.preview}\n\n---\n\n[Content placeholder — full markdown rendered from Gateway API]`}
                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                    <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors border border-zinc-700">
                      Edit Note
                    </button>
                    <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors">
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                  <div className="text-6xl mb-4">📚</div>
                  <p>Select a note from the vault to begin exploration.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
