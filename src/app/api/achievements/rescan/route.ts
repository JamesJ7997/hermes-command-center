import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST() {
  try {
    // Trigger a synchronous rescan by running the achievements scanner directly.
    // Uses importlib to load the plugin module since the directory name
    // (hermes-achievements) contains a hyphen and is not a valid Python identifier.
    const home = process.env.HOME || '/home/wolfj';
    const hermesHome = process.env.HERMES_HOME || `${home}/.hermes/profiles/weyrleader`;
    const pluginDir = `${home}/.hermes/hermes-agent/plugins/hermes-achievements/dashboard`;
    // Use Hermes's own venv so hermes_state and other deps are available
    const python = `${home}/.hermes/hermes-agent/venv/bin/python`;

    const result = execSync(
      `${python} -c "
import json, sys, importlib.util
spec = importlib.util.spec_from_file_location('plugin_api', '${pluginDir}/plugin_api.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
data = mod.compute_all()
print(json.dumps(data))
"`,
      {
        timeout: 120_000,
        maxBuffer: 50 * 1024 * 1024,
        env: {
          ...process.env,
          HOME: home,
          HERMES_HOME: hermesHome,
        },
      }
    );

    const data = JSON.parse(result.toString());

    return NextResponse.json({
      ok: true,
      achievements: data.achievements || [],
      total: data.total_count || 0,
      unlocked_count: data.unlocked_count || 0,
      scan_meta: data.scan_meta || {},
    });
  } catch (err) {
    console.error('Achievements rescan error:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500}
    );
  }
}
