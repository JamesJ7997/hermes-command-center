export interface DragonStatus {
  name: string;
  role: string;
  color: string;
  status: "flying" | "waiting" | "landed" | "failed" | "idle";
  mission: string | null;
}

export interface Mission {
  mission: string;       // mission ID
  name: string;          // mission name
  wing: string;
  type: string;
  mode: "bg" | "fg";
  status: string;        // IN_PROGRESS | QUEUED | COMPLETED | FAILED | PENDING
  dragons?: DragonStatus[];
  startedAt: string;
  needs?: string;        // queued missions: which dragons needed
  position?: number;     // queued missions: queue position
  output?: string;
}

export interface SwarmQueue {
  active: Mission[];
  queued: Mission[];
  completed: Mission[];
}

export const DRAGON_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  bronze: "#d97706",
  brown: "#92400e",
  gold: "#eab308",
  green: "#10b981",
  white: "#e5e7eb",
  default: "#71717a",
};

export function dragonColor(color: string): string {
  return DRAGON_COLORS[color.toLowerCase()] ?? DRAGON_COLORS.default;
}

export function statusColor(status: DragonStatus["status"]): string {
  switch (status) {
    case "flying":
      return "#10b981";
    case "waiting":
      return "#eab308";
    case "landed":
      return "#3b82f6";
    case "failed":
      return "#ef4444";
    case "idle":
      return "#71717a";
    default:
      return "#71717a";
  }
}

export function missionStatusColor(status: string): string {
  switch (status) {
    case "in_progress":
    case "IN_PROGRESS":
    case "flying":
      return "#10b981";
    case "queued":
    case "QUEUED":
    case "waiting":
      return "#eab308";
    case "completed":
    case "COMPLETED":
    case "landed":
      return "#3b82f6";
    case "failed":
    case "FAILED":
      return "#ef4444";
    case "pending":
    case "PENDING":
      return "#71717a";
    default:
      return "#71717a";
  }
}
