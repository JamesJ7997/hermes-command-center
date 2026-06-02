import { NextResponse } from "next/server";
import { execSync } from "child_process";

async function getTaskDetail(id: string): Promise<any> {
  try {
    const out = execSync(`hermes kanban show "${id}" --json`, {
      encoding: "utf-8",
      timeout: 8000,
      shell: "/bin/bash",
    });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function getChildren(detail: any): string[] {
  return detail?.children ?? [];
}

function getParents(detail: any): string[] {
  return detail?.parents ?? [];
}

// Recursively fetch all descendants of a task
async function getAllDescendants(id: string, visited?: Set<string>): Promise<string[]> {
  if (!visited) visited = new Set();
  if (visited.has(id)) return [];
  visited.add(id);

  const detail = await getTaskDetail(id);
  if (!detail) return [];
  const childIds = detail.children ?? [];
  const allDescendants: string[] = [...childIds];

  for (const childId of childIds) {
    const grandChildren = await getAllDescendants(childId, visited);
    allDescendants.push(...grandChildren);
  }
  return allDescendants;
}

// Resolve child IDs into full task objects using the task map
function resolveTasks(ids: string[], taskMap: Map<string, any>): any[] {
  return ids.map((id: string) => taskMap.get(id)).filter(Boolean);
}

// Filter tasks that belong to a specific root (for finding verifier/synthesizer)
function getMissionTasks(rootId: string, allTasks: any[]): any[] {
  const rootTask = allTasks.find(t => t.id === rootId);
  if (!rootTask) return [];

  // The blackboard comment on the root contains the full mission spec
  // Workers, verifier, and synthesizer all reference the root ID in their body
  const relatedTasks = allTasks.filter((t: any) => {
    if (t.id === rootId) return false;
    // Check if task body references the root ID
    if (t.body && t.body.includes(rootId)) return true;
    // Check if root body references this task ID
    if (rootTask.body && rootTask.body.includes(t.id)) return true;
    return false;
  });

  return relatedTasks;
}

export async function GET() {
  try {
    const output = execSync('hermes kanban list --json 2>&1', {
      encoding: "utf-8",
      timeout: 15000,
      shell: "/bin/bash",
    });

    const tasks = JSON.parse(output);
    const taskMap = new Map(tasks.map((t: any) => [t.id, t]));

    // Categorize tasks by status
    const active = tasks.filter(
      (t: any) => t.status === "running" || t.status === "ready"
    );
    const queued = tasks.filter(
      (t: any) => t.status === "todo" || t.status === "scheduled"
    );
    const completed = tasks.filter(
      (t: any) => t.status === "done"
    );
    const failed = tasks.filter(
      (t: any) => t.status === "failed"
    );
    const blocked = tasks.filter(
      (t: any) => t.status === "blocked"
    );

    // Build full swarm trees recursively
    const swarmRoots = await Promise.all(
      tasks
        .filter((t: any) => t.title.startsWith("Swarm:"))
        .map(async (root: any) => {
          // Get all descendants recursively through the Kanban parent→child chain
          const descendantIds = await getAllDescendants(root.id);
          const directChildIds = getChildren(await getTaskDetail(root.id));

          // Also find tasks that reference this root in their body (verifier/synthesizer)
          const bodyRelated = tasks.filter((t: any) => {
            if (t.id === root.id) return false;
            return t.body && t.body.includes(root.id);
          }).map((t: any) => t.id);

          // Combine: direct Kanban descendants + body-reference matches
          const allChildIds = [...new Set([...descendantIds, ...bodyRelated])];
          const allChildren = resolveTasks(allChildIds, taskMap as Map<string, any>);

          return {
            ...root,
            children: allChildren,
            directChildren: resolveTasks(directChildIds, taskMap as Map<string, any>),
          };
        })
    );

    return NextResponse.json({
      active,
      queued,
      completed: completed.slice(0, 20),
      failed,
      blocked,
      swarmRoots,
      raw: tasks,
      stats: {
        total: tasks.length,
        active: active.length,
        queued: queued.length,
        completed: completed.length,
        failed: failed.length,
        blocked: blocked.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch kanban:", error);
    return NextResponse.json(
      {
        active: [],
        queued: [],
        completed: [],
        failed: [],
        blocked: [],
        swarmRoots: [],
        raw: [],
        stats: { total: 0, active: 0, queued: 0, completed: 0, failed: 0, blocked: 0 },
        error: "Failed to fetch kanban",
      },
      { status: 500 }
    );
  }
}
