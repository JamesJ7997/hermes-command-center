import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

function parseStatus(text: string) {
  const connected = text.includes('Gateway Service') && !text.includes('Status:       ✗');
  const versionMatch = text.match(/Python:\s+([\d.]+)/);
  const modelMatch = text.match(/Model:\s+(.+)/);
  const profileMatch = text.match(/Profile:\s+(.+)/);

  return {
    connected,
    version: versionMatch?.[1] ?? 'unknown',
    activeProfile: profileMatch?.[1]?.trim() ?? 'weyrleader',
    model: modelMatch?.[1]?.trim() ?? 'unknown',
  };
}

export async function GET() {
  try {
    const output = execSync('hermes status --all 2>&1', {
      timeout: 15000,
      encoding: 'utf-8',
      shell: '/bin/bash',
    });

    const parsed = parseStatus(output);

    return NextResponse.json({
      connected: true,
      version: parsed.version,
      activeProfile: parsed.activeProfile || 'weyrleader',
    });
  } catch {
    return NextResponse.json({
      connected: false,
      version: 'unknown',
      activeProfile: 'none',
    });
  }
}
