import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';

const SNAPSHOT_PATH = `${process.env.HOME}/.hermes/plugins/hermes-achievements/scan_snapshot.json`;

export async function GET() {
  try {
    if (!existsSync(SNAPSHOT_PATH)) {
      return NextResponse.json(
        { achievements: [], total: 0, unlocked_count: 0, categories: [] },
        { status: 200 }
      );
    }

    const raw = readFileSync(SNAPSHOT_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const achievements = data.achievements || [];

    const unlocked = achievements.filter((a: { unlocked: boolean }) => a.unlocked);
    const categoryMap: Record<string, number> = {};
    for (const a of achievements) {
      categoryMap[a.category] = (categoryMap[a.category] || 0) + 1;
    }

    return NextResponse.json({
      achievements,
      total: achievements.length,
      unlocked_count: unlocked.length,
      categories: Object.entries(categoryMap).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    console.error('Achievements API error:', err);
    return NextResponse.json(
      { achievements: [], total: 0, unlocked_count: 0, categories: [], error: String(err) },
      { status: 500 }
    );
  }
}
