import { NextResponse } from "next/server";
import { execSync } from "child_process";

interface LaunchRequest {
  name: string;
  wing: string;
  type: string;
  mode: "bg" | "fg";
  description?: string;
}

interface SwarmResult {
  root_id: string;
  worker_ids: string[];
  verifier_id: string;
  synthesizer_id: string;
}

const WING_DRAGONS: Record<string, Record<string, string>> = {
  Phoenix: {
    implement: "phoenix-blue-rthar",
    review: "phoenix-gold-alaron",
    document: "phoenix-white-nora",
    research: "phoenix-green-yvel",
    evaluate: "phoenix-brown-sren",
    synthesize: "phoenix-white-nora",
  },
};

function buildSwarmCommand(req: LaunchRequest): string[] {
  const dragons = WING_DRAGONS[req.wing] ?? WING_DRAGONS.Phoenix;
  const goal = req.description || req.name;
  const cmd = ["hermes", "kanban", "swarm", "--json"];

  // T1: Child task titles include parent mission name.
  // Each child gets "Wing Mission: <name> — <Role>" as its title.
  const missionName = req.name;
  const childTitle = (role: string) => `Wing Mission: ${missionName} — ${role}`;

  // Root goal prefixed with "Warm:" for the parent card display
  const prefixedGoal = `Swarm: ${missionName}: ${goal}`;

  switch (req.type) {
    case "build":
      cmd.push("--worker", `${dragons.implement}:${childTitle("Implement")}`);
      cmd.push("--verifier", `${dragons.review}:${childTitle("Verify")}`);
      cmd.push("--synthesizer", `${dragons.document}:${childTitle("Synthesize")}`);
      break;
    case "explore":
      cmd.push("--worker", `${dragons.research}:${childTitle("Research")}`);
      cmd.push("--verifier", `${dragons.evaluate}:${childTitle("Evaluate")}`);
      cmd.push("--synthesizer", `${dragons.document}:${childTitle("Synthesize")}`);
      break;
    case "review":
      cmd.push("--verifier", `${dragons.review}:${childTitle("Verify")}`);
      cmd.push("--synthesizer", `${dragons.document}:${childTitle("Synthesize")}`);
      break;
    case "full":
      cmd.push("--worker", `${dragons.implement}:${childTitle("Implement")}`);
      cmd.push("--worker", `${dragons.research}:${childTitle("Explore")}`);
      cmd.push("--verifier", `${dragons.review}:${childTitle("Verify")}`);
      cmd.push("--synthesizer", `${dragons.synthesize}:${childTitle("Synthesize")}`);
      break;
    default:
      cmd.push("--worker", `${dragons.implement}:${childTitle("Implement")}`);
      cmd.push("--verifier", `${dragons.review}:${childTitle("Verify")}`);
      cmd.push("--synthesizer", `${dragons.document}:${childTitle("Synthesize")}`);
  }

  cmd.push(prefixedGoal);
  return cmd;
}

export async function POST(request: Request) {
  try {
    const body: LaunchRequest = await request.json();

    if (!body.name || !body.wing || !body.type) {
      return NextResponse.json(
        { error: "Missing required fields: name, wing, type" },
        { status: 400 }
      );
    }

    const cmd = buildSwarmCommand(body);
    const cmdStr = cmd.map((c) => `'${c.replace(/'/g, "'\\''")}'`).join(" ");

    console.log(`[swarm launch] ${cmdStr}`);

    const output = execSync(cmdStr, {
      timeout: 30000,
      encoding: "utf-8",
      shell: "/bin/bash",
    });

    const result: SwarmResult = JSON.parse(output.trim());

    return NextResponse.json({
      id: result.root_id,
      name: body.name,
      wing: body.wing,
      type: body.type,
      mode: body.mode ?? "bg",
      status: "dispatched",
      swarm: {
        root: result.root_id,
        workers: result.worker_ids,
        verifier: result.verifier_id,
        synthesizer: result.synthesizer_id,
      },
      totalTasks: 1 + result.worker_ids.length + 2,
    });
  } catch (error: any) {
    console.error("Failed to launch swarm:", error.message);
    return NextResponse.json(
      { error: error.message ?? "Failed to launch mission" },
      { status: 500 }
    );
  }
}
