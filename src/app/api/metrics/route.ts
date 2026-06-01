import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

function parseInsights(text: string) {
  const sessionsMatch = text.match(/Sessions:\s+(\d+)/);
  const toolCallsMatch = text.match(/Tool calls:\s+(\d+)/);
  const totalTokensMatch = text.match(/Total tokens:\s+([\d,]+)/);
  const inputTokensMatch = text.match(/Input tokens:\s+([\d,]+)/);
  const modelMatch = text.match(/Model\s+ Sessions\s+ Tokens\s*\n\s*(\S+)/);

  // Parse active sessions from status line or default to 0
  const activeSessionsMatch = text.match(/Active:\s+(\d+)/);

  return {
    activeSessions: parseInt(activeSessionsMatch?.[1] ?? '0', 10) || 0,
    totalTokens: parseInt(totalTokensMatch?.[1]?.replace(/,/g, '') ?? '0', 10) || 0,
    apiCalls: parseInt(toolCallsMatch?.[1]?.replace(/,/g, '') ?? '0', 10) || 0,
    activeModel: modelMatch?.[1]?.trim() ?? 'unknown',
    inputTokens: parseInt(inputTokensMatch?.[1]?.replace(/,/g, '') ?? '0', 10) || 0,
    sessions: parseInt(sessionsMatch?.[1] ?? '0', 10) || 0,
  };
}

export async function GET() {
  try {
    const output = execSync('hermes insights 2>&1', {
      timeout: 15000,
      encoding: 'utf-8',
      shell: '/bin/bash',
    });

    const parsed = parseInsights(output);

    return NextResponse.json({
      activeSessions: parsed.activeSessions,
      totalTokens: parsed.totalTokens,
      apiCalls: parsed.apiCalls,
      activeModel: parsed.activeModel,
    });
  } catch {
    return NextResponse.json({
      activeSessions: 0,
      totalTokens: 0,
      apiCalls: 0,
      activeModel: 'unknown',
    });
  }
}
