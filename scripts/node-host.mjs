import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
process.env.MAHJONG_HOSTING = 'node';
process.env.NEXT_TELEMETRY_DISABLED = '1';
const action = process.argv[2];
if (action === 'build') {
  const result = spawnSync(process.execPath, ['./node_modules/next/dist/bin/next', 'build', '--webpack'], { stdio: 'inherit', env: process.env });
  process.exit(result.status ?? 1);
}
if (!['start', 'migrate'].includes(action)) throw new Error('用法：node scripts/node-host.mjs build|start|migrate');
const { localClient, migrate } = await import('../runtime/node-bindings.mjs');
const { createClient } = await import('@libsql/client/web');
const url = process.env.TURSO_DATABASE_URL;
if (url && !process.env.TURSO_AUTH_TOKEN) throw new Error('请设置 TURSO_AUTH_TOKEN。');
if (!url && process.env.RENDER) throw new Error('Render 部署需要 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN，避免重启时丢失数据。');
const client = url ? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  : localClient(resolve(process.env.MAHJONG_DATA_DIR ?? '.node-data', 'mahjong.sqlite'));
await migrate(client);
client.close();
console.log('数据库迁移检查完成。');
if (action === 'migrate') process.exit(0);

const { createServer } = await import('node:http');
const { default: next } = await import('next');
const { isIP } = await import('node:net');
const port = Number(process.env.PORT ?? 3000);
const publicUrl = new URL(process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? `http://127.0.0.1:${port}`);
process.env.PUBLIC_BASE_URL = publicUrl.origin;
const app = next({ dev: false, hostname: publicUrl.hostname, port: Number(publicUrl.port || (publicUrl.protocol === 'https:' ? 443 : 80)) });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer(async (req, res) => {
  // Strip the client-supplied Cloudflare header; only the Render proxy is trusted.
  const forwarded = process.env.RENDER ? req.headers['x-forwarded-for']?.split(',').at(-1)?.trim() : null;
  req.headers['cf-connecting-ip'] = forwarded && isIP(forwarded) ? forwarded : req.socket.remoteAddress ?? 'unknown';
  req.headers['x-forwarded-proto'] = publicUrl.protocol === 'https:' ? 'https' : 'http';
  try { await handle(req, res); }
  catch { if (!res.headersSent) { res.writeHead(500); res.end('服务暂时不可用，请稍后重试'); } }
});
server.listen(port, '0.0.0.0', () => console.log(`贵阳麻将已启动，端口 ${port}。`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.close(); app.close().finally(() => process.exit(0)); });
