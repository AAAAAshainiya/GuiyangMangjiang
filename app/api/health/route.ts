import { db } from '@/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await db().prepare('SELECT 1 AS ready FROM mahjong_rooms LIMIT 1').all();
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
