import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@libsql/client/web';

// The game keeps its existing prepared queries and optimistic room updates.
// Both implementations provide atomic batches; application code stays shared.
export function localClient(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const execute = ({ sql, args = [] }) => {
    const statement = sqlite.prepare(sql);
    const rows = statement.columns().length ? statement.all(...args) : [];
    const result = statement.columns().length ? sqlite.prepare('SELECT changes() AS n, last_insert_rowid() AS id').get()
      : statement.run(...args);
    return { rows, rowsAffected: Number(result.changes ?? result.n), lastInsertRowid: result.lastInsertRowid ?? result.id };
  };
  return {
    async execute(statement) { return execute(statement); },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(execute); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    close() { sqlite.close(); },
  };
}

export async function migrate(client, root = process.cwd()) {
  await client.execute({ sql: 'CREATE TABLE IF NOT EXISTS mahjong_node_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL)', args: [] });
  for (const name of readdirSync(resolve(root, 'drizzle')).filter(name => name.endsWith('.sql')).sort()) {
    const sql = readFileSync(resolve(root, 'drizzle', name), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    const existing = await client.execute({ sql: 'SELECT hash FROM mahjong_node_migrations WHERE name=?', args: [name] });
    if (existing.rows.length) {
      if (existing.rows[0].hash !== hash) throw new Error('已执行的数据库迁移发生变化，请先核对迁移文件。');
      continue;
    }
    const statements = sql.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean).map(sql => ({ sql, args: [] }));
    await client.batch([...statements, { sql: 'INSERT INTO mahjong_node_migrations (name,hash) VALUES (?,?)', args: [name, hash] }], 'write');
  }
  // Small avatars (<=350 KB) and private backups share durable database storage.
  await client.execute({ sql: 'CREATE TABLE IF NOT EXISTS mahjong_node_objects (key TEXT PRIMARY KEY, body BLOB NOT NULL, content_type TEXT NOT NULL, etag TEXT NOT NULL, uploaded INTEGER NOT NULL)', args: [] });
}

const convert = result => ({ results: result.rows.map(row => Object.fromEntries(Object.entries(row))), success: true,
  meta: { changes: Number(result.rowsAffected), last_row_id: Number(result.lastInsertRowid ?? 0) } });
export function bindingsFor(client) {
  class Statement {
    constructor(sql, args = []) { this.sql = sql; this.args = args; }
    bind(...args) { return new Statement(this.sql, args); }
    async all() { return convert(await client.execute({ sql: this.sql, args: this.args })); }
    async first(column) {
      const result = await this.all();
      const row = result.results[0] ?? null;
      return column === undefined ? row : row?.[column] ?? null;
    }
    async run() { return this.all(); }
  }
  const DB = {
    prepare(sql) { return new Statement(sql); },
    async batch(statements) {
      return (await client.batch(statements.map(({ sql, args }) => ({ sql, args })), 'write')).map(convert);
    },
  };
  const bytesOf = value => typeof value === 'string' ? Buffer.from(value) : Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
  const BUCKET = {
    async put(key, value, options = {}) {
      const bytes = bytesOf(value);
      const etag = createHash('sha256').update(bytes).digest('hex');
      await DB.prepare('INSERT INTO mahjong_node_objects (key,body,content_type,etag,uploaded) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET body=excluded.body,content_type=excluded.content_type,etag=excluded.etag,uploaded=excluded.uploaded')
        .bind(key, bytes, options.httpMetadata?.contentType ?? 'application/octet-stream', etag, Date.now()).run();
      return { key, etag };
    },
    async get(key) {
      const row = await DB.prepare('SELECT * FROM mahjong_node_objects WHERE key=?').bind(key).first();
      if (!row) return null;
      const bytes = Buffer.from(row.body);
      return { key, body: new Uint8Array(bytes), httpEtag: '"' + row.etag + '"', uploaded: new Date(row.uploaded),
        writeHttpMetadata(headers) { headers.set('Content-Type', row.content_type); },
        async json() { return JSON.parse(bytes.toString('utf8')); },
      };
    },
    async delete(key) { await DB.prepare('DELETE FROM mahjong_node_objects WHERE key=?').bind(key).run(); },
    async list({ prefix = '', limit = 50, cursor } = {}) {
      const rows = await DB.prepare('SELECT key, uploaded FROM mahjong_node_objects WHERE substr(key,1,length(?))=? AND key>? ORDER BY key LIMIT ?')
        .bind(prefix, prefix, cursor ?? '', Math.min(Math.max(limit, 1), 1000) + 1).all();
      const objects = rows.results.slice(0, limit).map(row => ({ key: row.key, uploaded: new Date(row.uploaded) }));
      const truncated = rows.results.length > limit;
      return { objects, truncated, ...(truncated ? { cursor: objects.at(-1).key } : {}) };
    },
  };
  return { DB, BUCKET };
}

const globalKey = Symbol.for('guiyang-mahjong.node-bindings');
function getBindings() {
  if (!globalThis[globalKey]) {
    const url = process.env.TURSO_DATABASE_URL;
    if (url && !process.env.TURSO_AUTH_TOKEN) throw new Error('请设置 TURSO_AUTH_TOKEN。');
    if (!url && process.env.RENDER) throw new Error('Render 部署必须配置独立数据库，不能使用会丢失数据的临时磁盘。');
    const client = url ? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
      : localClient(resolve(process.env.MAHJONG_DATA_DIR ?? '.node-data', 'mahjong.sqlite'));
    globalThis[globalKey] = bindingsFor(client);
  }
  return globalThis[globalKey];
}
export const env = new Proxy({}, { get(_, key) { return getBindings()[key]; } });
