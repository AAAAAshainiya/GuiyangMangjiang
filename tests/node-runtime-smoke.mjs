import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = 31943, base = `http://127.0.0.1:${port}`;
const directory = resolve('.sites-runtime', 'node-http-test', randomUUID());
let server, logs = '', publicOrigin = base;
async function start(origin = base) {
  publicOrigin = origin; logs = '';
  server = spawn(process.execPath, ['scripts/node-host.mjs', 'start'], { env: {
    ...process.env, PORT: String(port), PUBLIC_BASE_URL: origin, MAHJONG_DATA_DIR: directory,
    TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '', RENDER: '', NODE_ENV: 'production',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error('Node server failed: ' + logs);
    try { if ((await fetch(base + '/api/health')).status === 200) return; } catch {}
    await delay(100);
  }
  throw new Error('Node server startup timed out: ' + logs);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const stopped = new Promise(resolve => server.once('exit', resolve)); server.kill(); await stopped;
}
const cookieOf = response => response.headers.get('set-cookie').split(';')[0];
async function post(path, body, cookie = '', origin = publicOrigin) {
  return fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', origin,
    ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
}
async function jsonOk(response) { assert.equal(response.status, 200, await response.clone().text()); return response.json(); }
try {
  await start();
  for (const path of ['/', '/solo', '/learn']) {
    const response = await fetch(base + path); assert.equal(response.status, 200, path);
    assert.match(await response.text(), /贵阳捉鸡麻将/);
  }
  for (const path of ['/guiyang-logo.png', '/tiles/0.webp', '/tiles/26.webp', '/favicon.svg']) {
    assert.equal((await fetch(base + path)).status, 200, path);
  }
  const password = randomUUID();
  let response = await post('/api/account', { action: 'register', username: 'render_smoke', password, nickname: '免费部署测试' });
  await jsonOk(response); const cookie = cookieOf(response);
  response = await post('/api/table', { action: 'create', name: '免费部署测试' }, cookie);
  const { code } = await jsonOk(response); assert.match(code, /^[A-Z0-9]{4}$/);
  await jsonOk(await post('/api/table', { action: 'fill', code }, cookie));
  const guest = cookieOf(await fetch(base + '/api/table'));
  const room = await jsonOk(await post('/api/table', { action: 'join', code, name: '牌友' }, guest));
  assert.equal(room.players.filter(player => !player.bot).length, 2);
  await jsonOk(await post('/api/table', { action: 'chat', code, text: '迁移成功', kind: 'text', clientId: randomUUID() }, guest));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSioAAAAASUVORK5CYII=', 'base64');
  response = await fetch(base + '/api/account/avatar', { method: 'POST', headers: { 'content-type': 'image/png', cookie, origin: publicOrigin }, body: png });
  const avatar = (await jsonOk(response)).user.avatar;
  const avatarResponse = await fetch(base + avatar);
  assert.equal(avatarResponse.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await avatarResponse.arrayBuffer()), png);
  const data = await jsonOk(await fetch(base + '/api/account/data', { headers: { cookie } }));
  assert(data.items.length >= 1); assert.equal(data.backup.pending, 0);
  assert.equal((await fetch(base + '/api/account/data')).status, 401);
  assert.equal((await post('/api/account', { action: 'login', username: 'render_smoke', password }, '', 'https://evil.example')).status, 403);
  assert.equal((await post('/api/table', { action: 'create', name: '坏来源' }, cookie, 'https://evil.example')).status, 403);
  await stop();
  await start('https://mahjong.example');
  response = await post('/api/account', { action: 'login', username: 'render_smoke', password });
  await jsonOk(response); const nextCookie = cookieOf(response);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.deepEqual(Buffer.from(await (await fetch(base + avatar)).arrayBuffer()), png, 'avatar survives server restart');
  const saved = await jsonOk(await fetch(base + '/api/table?room=' + code, { headers: { cookie: nextCookie } }));
  assert.equal(saved.code, code, 'room survives server restart');
  assert.equal((await post('/api/account', { action: 'login', username: 'render_smoke', password }, '', base)).status, 403, 'HTTPS proxy must reject wrong origin');
  console.log('PASS production Node HTTP: 3 SSR pages, assets, account/login/cookies, room/fill/join/chat, avatar upload, private backups, restart persistence and HTTPS proxy origin checks.');
} finally { await stop(); }
