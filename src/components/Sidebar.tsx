"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gateway, GatewayStatus } from "@/lib/gateway";

interface NavItemDef {
  icon: string;
  label: string;
  href: string;
}

const COMMAND_CENTER: NavItemDef[] = [
  { icon: "📊", label: "Dashboard", href: "/" },
  { icon: "🏆", label: "Achievements", href: "/achievements" },
  { icon: "🐝", label: "Wing Command", href: "/swarm" },
  { icon: "👤", label: "Profiles", href: "/profiles" },
];

const SYSTEM_REGISTRY: NavItemDef[] = [
  { icon: "🧩", label: "Skills", href: "/skills" },
  { icon: "🔌", label: "MCP Servers", href: "/mcp" },
  { icon: "⏰", label: "Cron Jobs", href: "/cron" },
];

const KNOWLEDGE: NavItemDef[] = [
  { icon: "📚", label: "Vault Browser", href: "/vault" },
];

function NavItem({ icon, label, href, active }: NavItemDef & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors no-underline ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function NavGroup({ title, items, pathname }: { title: string; items: NavItemDef[]; pathname: string }) {
  return (
    <>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 mt-6 mb-2">
        {title}
      </div>
      {items.map((item) => (
        <NavItem key={item.href} {...item} active={pathname === item.href} />
      ))}
    </>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<GatewayStatus>({
    connected: false,
    version: "loading",
    activeProfile: "none",
  });

  useEffect(() => {
    async function sync() {
      const s = await gateway.getStatus();
      setStatus(s);
    }
    sync();
    const interval = setInterval(sync, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      <div className="p-6 border-b border-zinc-800">
        <Link href="/" className="no-underline">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            HERMES <span className="text-zinc-500 font-normal">Command Center</span>
          </h1>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-auto">
        <NavGroup title="Command Center" items={COMMAND_CENTER} pathname={pathname} />
        <NavGroup title="System Registry" items={SYSTEM_REGISTRY} pathname={pathname} />
        <NavGroup title="Knowledge" items={KNOWLEDGE} pathname={pathname} />
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div
          className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
            status.connected
              ? "bg-zinc-800/50 text-zinc-400"
              : "bg-rose-900/20 text-rose-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status.connected ? "bg-green-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          Gateway: {status.connected ? "Connected" : "Disconnected"}
        </div>
      </div>
    </aside>
  );
}
