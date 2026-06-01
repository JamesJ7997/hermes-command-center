import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const output = execSync('hermes kanban list --json 2>&1', {
      timeout: 15000,
      encoding: "utf-8",
      shell: "/bin/bash",
    });

    const tasks = JSON.parse(output);

    // Categorize tasks by status
    const active = tasks.filter(
      (t: any) => t.status === "running" || t.status === "ready"
    );
    const queued = tasks.filter(
      (t: any) => t.status === "todo" || t.status === "scheduled"
    );
    const completed = tasks.filter(
      (t: any) => t.status === "done" || t.status === "archived"
    );

    // Group swarm roots with their children
    const swarmRoots = tasks.filter(
      (t: any) => t.title.startsWith("Swarm:") && t.status !== "archived"
    );

    return NextResponse.json({
      active,
      queued,
      completed: completed.slice(0, 10), // last 10 completed
      swarmRoots,
      raw: tasks,
      stats: {
        total: tasks.length,
        active: active.length,
        queued: queued.length,
        completed: completed.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch kanban:", error);
    return NextResponse.json(
      { active: [], queued: [], completed: [], swarmRoots: [], raw: [], stats: { total: 0, active: 0, queued: 0, completed: 0 }, error: "Failed to fetch kanban" },
      { status: 500 }
    );
  }
}
