import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { localClient, migrate, bindingsFor } from '../runtime/node-bindings.mjs';

const directory = resolve('.sites-runtime', 'node-storage-test', randomUUID());
mkdirSync(directory, { recursive: true });
const filename = resolve(directory, 'database.sqlite');
let client = localClient(filename);
try {
  await migrate(client);
  await migrate(client);
  let { DB, BUCKET } = bindingsFor(client);
  assert.equal(await DB.prepare('SELECT count(*) AS n FROM mahjong_node_migrations').first('n'), 6);
  await assert.rejects(DB.batch([
    DB.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,?,?)').bind('TEST', '{}', 0, 1),
    DB.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,?,?)').bind('TEST', '{}', 0, 1),
  ]));
  assert.equal(await DB.prepare('SELECT * FROM mahjong_rooms WHERE code=?').bind('TEST').first(), null, 'batch must roll back');
  await DB.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,?,?)').bind('TEST', '{}', 0, 1).run();
  assert.equal((await DB.prepare('UPDATE mahjong_rooms SET version=1 WHERE code=? AND version=0').bind('TEST').run()).meta.changes, 1);
  assert.equal((await DB.prepare('UPDATE mahjong_rooms SET version=2 WHERE code=? AND version=0').bind('TEST').run()).meta.changes, 0, 'concurrent stale update must not overwrite');
  const image = Uint8Array.from([137, 80, 78, 71, 1, 2, 3]);
  await BUCKET.put('avatars/test.png', image, { httpMetadata: { contentType: 'image/png' } });
  for (const key of ['a', 'b', 'c']) await BUCKET.put('backups/user/' + key, JSON.stringify({ key }));
  await BUCKET.put('backups/other/secret', '{}');
  const page = await BUCKET.list({ prefix: 'backups/user/', limit: 2 });
  assert.equal(page.objects.length, 2); assert.equal(page.truncated, true);
  const next = await BUCKET.list({ prefix: 'backups/user/', cursor: page.cursor, limit: 2 });
  assert.equal(next.objects.length, 1); assert.equal(next.truncated, false);
  assert.equal((await BUCKET.get('backups/user/c')).json instanceof Function, true);
  assert.equal((await (await BUCKET.get('backups/user/c')).json()).key, 'c');
  client.close(); client = localClient(filename);
  ({ DB, BUCKET } = bindingsFor(client));
  assert.equal(await DB.prepare('SELECT version FROM mahjong_rooms WHERE code=?').bind('TEST').first('version'), 1);
  const object = await BUCKET.get('avatars/test.png');
  assert.deepEqual(object.body, image, 'avatar must survive reopening database');
  const headers = new Headers(); object.writeHttpMetadata(headers); assert.equal(headers.get('content-type'), 'image/png');
  await BUCKET.delete('avatars/test.png'); assert.equal(await BUCKET.get('avatars/test.png'), null);
  console.log('PASS Node storage: six idempotent migrations, transaction rollback, room conflicts, persistent avatar, private backup pagination.');
} finally { client.close(); }
