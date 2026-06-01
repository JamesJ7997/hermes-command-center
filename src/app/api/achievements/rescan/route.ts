import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

export async function POST() {
  try {
    const home = process.env.HOME || '/home/wolfj';
    const hermesHome = "/home/wolfj/.hermes/profiles/weyrleader";
    const pluginDir = `${home}/.hermes/hermes-agent/plugins/hermes-achievements/dashboard`;
    const python = `${home}/.hermes/hermes-agent/venv/bin/python`;

    // Write a small runner script to avoid nested quoting issues when passing
    // Python -c through execSync template literals. The runner handles JSON
    // serialization of non-standard types (e.g. set) that compute_all() may return.
    const runnerScript = `${pluginDir}/_run_scan.py`;

    const runnerCode = [
      'import json, sys, importlib.util',
      `spec = importlib.util.spec_from_file_location('plugin_api', '${pluginDir}/plugin_api.py')`,
      'mod = importlib.util.module_from_spec(spec)',
      'sys.modules["plugin_api"] = mod',
      'spec.loader.exec_module(mod)',
      'data = mod.compute_all()',
      'class SetEncoder(json.JSONEncoder):',
      '    def default(self, o):',
      '        if isinstance(o, set):',
      '            try:',
      '                return sorted(o)',
      '            except TypeError:',
      '                return list(o)',
      '        if isinstance(o, bytes):',
      '            return o.decode("utf-8", "replace")',
      '        return super().default(o)',
      'print(json.dumps(data, cls=SetEncoder))',
    ].join('\n');

    writeFileSync(runnerScript, runnerCode);

    try {
      const result = execSync(`${python} ${runnerScript}`, {
        timeout: 120_000,
        maxBuffer: 50 * 1024 * 1024,
        env: {
          ...process.env,
          HOME: home,
          HERMES_HOME: hermesHome,
        },
      });

      const data = JSON.parse(result.toString());

      return NextResponse.json({
        ok: true,
        achievements: data.achievements || [],
        total: data.total_count || 0,
        unlocked_count: data.unlocked_count || 0,
        scan_meta: data.scan_meta || {},
      });
    } finally {
      // Clean up the temp runner script
      try {
        unlinkSync(runnerScript);
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (err) {
    console.error('Achievements rescan error:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
