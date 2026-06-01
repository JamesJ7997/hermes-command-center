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

  // Assign workers based on mission type
  switch (req.type) {
    case "build":
      cmd.push("--worker", `${dragons.implement}:implement`);
      cmd.push("--verifier", `${dragons.review}:review`);
      cmd.push("--synthesizer", `${dragons.document}:document`);
      break;
    case "explore":
      cmd.push("--worker", `${dragons.research}:research`);
      cmd.push("--verifier", `${dragons.evaluate}:evaluate`);
      cmd.push("--synthesizer", `${dragons.document}:document`);
      break;
    case "review":
      cmd.push("--verifier", `${dragons.review}:review`);
      cmd.push("--synthesizer", `${dragons.document}:document`);
      break;
    case "full":
      cmd.push("--worker", `${dragons.implement}:implement`);
      cmd.push("--worker", `${dragons.research}:explore`);
      cmd.push("--verifier", `${dragons.review}:review`);
      cmd.push("--synthesizer", `${dragons.synthesize}:synthesize`);
      break;
    default:
      cmd.push("--worker", `${dragons.implement}:implement`);
      cmd.push("--verifier", `${dragons.review}:review`);
      cmd.push("--synthesizer", `${dragons.document}:document`);
  }

  cmd.push(goal);
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
      totalTasks: 1 + result.worker_ids.length + 2, // root + workers + verifier + synthesizer
    });
  } catch (error: any) {
    console.error("Failed to launch swarm:", error.message);
    return NextResponse.json(
      { error: error.message ?? "Failed to launch mission" },
      { status: 500 }
    );
  }
}
