"use client";

import React, { useEffect, useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────

interface Tier {
  name: string;
  threshold: number;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  criteria: string;
  kind: string;
  state: "unlocked" | "discovered" | "secret";
  unlocked: boolean;
  tier: string | null;
  tiers: Tier[];
  progress: number;
  progress_pct: number;
  next_tier: string;
  next_threshold: number;
  threshold_metric: string;
  secret?: boolean;
  unlocked_at?: number;
}

interface AchievementsPayload {
  achievements: Achievement[];
  total: number;
  unlocked_count: number;
  categories: { name: string; count: number }[];
}

// ── Helpers ────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { ring: string; bg: string; text: string }> = {
  Copper:  { ring: "ring-amber-700",   bg: "bg-amber-900/30",   text: "text-amber-400" },
  Silver:  { ring: "ring-zinc-400",    bg: "bg-zinc-700/30",    text: "text-zinc-300" },
  Gold:    { ring: "ring-yellow-500",  bg: "bg-yellow-900/30",  text: "text-yellow-400" },
  Diamond: { ring: "ring-cyan-400",    bg: "bg-cyan-900/30",    text: "text-cyan-300" },
  Olympian:{ ring: "ring-purple-500",  bg: "bg-purple-900/30",  text: "text-purple-400" },
};

const ICON_MAP: Record<string, string> = {
  flame: "🔥", swap: "🔄", avalanche: "⛰️", terminal: "💻", scroll: "📜",
  dragon: "🐉", compass: "🧭", wand: "✨", key: "🔑", hammer_scroll: "📜⚒️",
  crystal: "💎", marina: "⚓", rocket: "🚀", eye: "👁️", puzzle: "🧩",
  wave: "🌊", clock: "⏰", moon: "🌙", calendar: "📅", codex: "📖",
  blueprint: "📐", browser: "🌐", plug: "🔌", router: "📡", antenna: "📡",
  anvil: "🔨", branch: "🌿", cache: "🗄️", colon: ":", container: "📦",
  daemon: "👹", folder: "📁", marathon: "🏃", melting_clock: "⏳", needle: "📍",
  nodes: "🔗", package_skull: "💀", palace: "🏰", pencil: "✏️", pixel: "🟩",
  prism: "🔬", quote: "💬", restart: "🔄", rewind: "⏪", secret: "❓",
  ship: "⛵", spark_cursor: "🖱️", spiral: "🌀", wand2: "🪄",
  warning: "⚠️", wine: "🍷", palatte: "🎨", bell: "🔔",
};

function iconFor(id: string): string {
  return ICON_MAP[id] || "🏆";
}

function tierStyle(tier: string | null) {
  if (!tier) return { ring: "ring-zinc-700", bg: "bg-zinc-800/30", text: "text-zinc-400" };
  return TIER_STYLES[tier] || TIER_STYLES.Copper;
}

// ── Components ──────────────────────────────────────────────────────

function ProgressBar({ pct, state, tier }: { pct: number; state: string; tier: string | null }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  const color = state === "unlocked"
    ? (tier === "Diamond" ? "bg-cyan-500" : tier === "Gold" ? "bg-yellow-500" : tier === "Silver" ? "bg-zinc-400" : tier === "Olympian" ? "bg-purple-500" : "bg-amber-600")
    : "bg-emerald-600";

  return (
    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [expanded, setExpanded] = useState(false);
  const a = achievement;
  const style = tierStyle(a.tier);

  if (a.state === "secret") {
    return (
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 opacity-60">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">❓</span>
          <div>
            <div className="text-sm font-bold text-zinc-500">???</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">{a.category}</div>
          </div>
        </div>
        <p className="text-xs text-zinc-600 italic">Hidden achievement. Keep riding to reveal it.</p>
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-xl border transition-all cursor-pointer group ${
        a.unlocked
          ? `bg-zinc-900 border-zinc-700 ring-1 ${style.ring} ring-opacity-30`
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${a.unlocked ? style.bg : "bg-zinc-800"}`}>
            {iconFor(a.icon)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 truncate">{a.name}</h3>
              {a.unlocked && (
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.bg} ${style.text} border border-zinc-700`}>
                  {a.tier}
                </span>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">{a.category} · {a.kind === "lifetime" ? "Lifetime" : "Best Session"}</div>
          </div>
        </div>
        {a.unlocked && (
          <span className="text-lg shrink-0">🏅</span>
        )}
      </div>

      <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{a.description}</p>

      {/* Progress */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
          <span>
            {a.unlocked
              ? `Next: ${a.next_tier} at ${a.next_threshold}`
              : `${a.next_tier} at ${a.next_threshold}`}
          </span>
          <span>{a.progress_pct}%</span>
        </div>
        <ProgressBar pct={a.progress_pct} state={a.state} tier={a.tier} />
      </div>

      {/* Expanded: What counts */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">What counts</div>
          <p className="text-xs text-zinc-400">{a.criteria}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {a.tiers.map((t) => (
              <span
                key={t.name}
                className={`text-[10px] px-2 py-0.5 rounded border ${
                  a.tier && TIER_STYLES[t.name]
                    ? `${TIER_STYLES[t.name].bg} ${TIER_STYLES[t.name].text} border-zinc-600`
                    : "bg-zinc-800 text-zinc-500 border-zinc-700"
                }`}
              >
                {t.name}: {t.threshold}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategorySection({ category, achievements }: { category: string; achievements: Achievement[] }) {
  const [open, setOpen] = useState(true);
  const unlockedInCat = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 mb-4 text-left w-full group"
      >
        <span className="text-zinc-500 text-sm">{open ? "▾" : "▸"}</span>
        <h2 className="text-lg font-bold text-zinc-200 group-hover:text-zinc-100 transition-colors">
          {category}
        </h2>
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
          {unlockedInCat}/{achievements.length}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AchievementsPayload = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRescan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const res = await fetch("/api/achievements/rescan", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Rescan failed");
      setData({
        achievements: json.achievements || [],
        total: json.total || 0,
        unlocked_count: json.unlocked_count || 0,
        categories: data?.categories || [],
      });
      setLastUpdated(new Date());
    } catch (err) {
      setScanError(String(err));
    } finally {
      setScanning(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-8">
        <div className="text-4xl mb-4">📡</div>
        <h2 className="text-xl font-bold mb-2 text-zinc-200">Signal Lost</h2>
        <p className="text-sm text-zinc-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-zinc-500">
        <div className="text-4xl mb-4 animate-pulse">⏳</div>
        <p>Scanning session history...</p>
      </div>
    );
  }

  // Group by category in the order they appear
  const categoryOrder: Record<string, Achievement[]> = {};
  for (const a of data.achievements) {
    if (!categoryOrder[a.category]) categoryOrder[a.category] = [];
    categoryOrder[a.category].push(a);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h2 className="text-3xl font-bold mb-1">Agentic Gamerscore</h2>
          <p className="text-zinc-400 italic text-sm">
            Collectible badges earned from real session history. Discovered badges show progress; secret badges stay hidden until the first matching behavior appears.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {scanError && (
            <div className="text-xs text-rose-400 bg-rose-900/20 px-3 py-1.5 rounded-lg border border-rose-800/50">
              Rescan failed: {scanError}
            </div>
          )}
          {lastUpdated && (
            <div className="text-[10px] text-zinc-600">
              Synced {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={handleRescan}
            disabled={scanning}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
              scanning
                ? "bg-zinc-700 text-zinc-400 cursor-wait"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {scanning ? (
              <>
                <span className="animate-spin">⟳</span> Scanning...
              </>
            ) : (
              <>
                <span>⟳</span> Rescan
              </>
            )}
          </button>
          <div className="text-right">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unlocked</div>
            <div className="text-2xl font-bold text-emerald-400">
              {data.unlocked_count}
              <span className="text-sm text-zinc-600 font-normal">/{data.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category sections */}
      <div className="flex-1 overflow-auto pr-2">
        {Object.entries(categoryOrder).map(([category, items]) => (
          <CategorySection key={category} category={category} achievements={items} />
        ))}
      </div>
    </div>
  );
}
