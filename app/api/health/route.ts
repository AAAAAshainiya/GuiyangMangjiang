import { db } from '@/db';
import { CURRENT_VERSION } from '@/lib/release-config';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await db().prepare('SELECT 1 AS ready FROM mahjong_rooms LIMIT 1').all();
    return Response.json({ status: 'ok', version: CURRENT_VERSION,
      ...(process.env.MAHJONG_HOSTING === 'node' && process.env.RENDER_GIT_COMMIT ? { commit: process.env.RENDER_GIT_COMMIT } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
