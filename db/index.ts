import { env } from 'cloudflare:workers';
export function db() {
  if (!env.DB) throw new Error('牌桌暂时连接不上，请稍后重试');
  return env.DB;
}
