import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !id.startsWith("t_")) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    // Fetch full task detail
    const showOut = execSync(`hermes kanban show "${id}" --json`, {
      encoding: "utf-8",
      timeout: 10000,
      shell: "/bin/bash",
    });
    const detail = JSON.parse(showOut);

    // Fetch full task list to resolve child IDs to objects
    const listOut = execSync("hermes kanban list --json 2>&1", {
      encoding: "utf-8",
      timeout: 15000,
      shell: "/bin/bash",
    });
    const allTasks = JSON.parse(listOut);
    const taskMap = new Map(allTasks.map((t: any) => [t.id, t]));

    // Resolve children from IDs to full task objects
    const childIds: string[] = detail.children || [];
    const resolvedChildren = childIds
      .map((cid: string) => taskMap.get(cid))
      .filter(Boolean);

    // T6: Add events array for frontend timeline
    const events = detail.events || [];

    // T8: Add polling metadata — event count + last event timestamp
    // so the frontend knows when to re-fetch
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;

    const response = NextResponse.json({
      task: detail.task,
      children: resolvedChildren,
      runs: detail.runs || [],
      comments: detail.comments || [],
      parents: detail.parents || [],
      events,
      event_count: events.length,
      last_event_ts: lastEvent?.created_at ?? null,
      last_event_kind: lastEvent?.kind ?? null,
    });

    // T8: Cache-Control header for smart polling
    response.headers.set(
      "Cache-Control",
      "s-maxage=5, stale-while-revalidate=10"
    );

    return response;
  } catch (error) {
    console.error(`Failed to fetch task ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch task detail" },
      { status: 500 }
    );
  }
}
