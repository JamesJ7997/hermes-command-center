import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }>}
) {
  const { id } = await params;

  if (!id || !id.startsWith("t_")) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    // Fetch task detail to get workspace_path
    const showOut = execSync(`hermes kanban show "${id}" --json`, {
      encoding: "utf-8",
      timeout: 10000,
      shell: "/bin/bash",
    });
    const detail = JSON.parse(showOut);
    const task = detail.task;
    const workspacePath = detail.workspace_path;

    // If workspace was GC'd, we can't read the log
    if (!workspacePath || !existsSync(workspacePath)) {
      return NextResponse.json({
        log: null,
        status: task?.status ?? "unknown",
        last_event: null,
        message: "Workspace garbage collected",
      });
    }

    // Look for log files in the workspace
    const logFiles = readdirSync(workspacePath).filter(
      (f: string) =>
        f.endsWith(".log") ||
        f === "worker.log" ||
        f === "output.log" ||
        f === "stdout.log"
    );

    let logContent = "";
    if (logFiles.length > 0) {
      // Read the most relevant log file
      const logPath = join(workspacePath, logFiles[0]);
      try {
        logContent = readFileSync(logPath, "utf-8").slice(-50000);
      } catch {
        logContent = "";
      }
    }

    // Get last event timestamp from events array
    const events = detail.events || [];
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;

    // Fallback: if no log file, try to get recent runs as text
    if (!logContent && detail.runs?.length > 0) {
      logContent = detail.runs
        .map((r: any) => {
          const lines = [`--- Run #${r.id} ---`];
          if (r.started_at)
            lines.push(`Started: ${new Date(r.started_at * 1000).toLocaleString()}`);
          if (r.summary) lines.push(r.summary);
          if (r.error) lines.push(`Error: ${r.error}`);
          return lines.join("\n");
        })
        .join("\n\n");
    }

    return NextResponse.json({
      log: logContent || null,
      status: task?.status ?? "unknown",
      last_event: lastEvent
        ? {
            kind: lastEvent.kind,
            created_at: lastEvent.created_at,
            payload: lastEvent.payload,
          }
        : null,
    });
  } catch (error: any) {
    console.error(`Failed to fetch log for task ${id}:`, error.message);
    return NextResponse.json(
      { error: "Failed to fetch task log" },
      { status: 500 }
    );
  }
}
