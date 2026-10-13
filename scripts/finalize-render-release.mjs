// Publish only after the existing Render service serves the exact tested commit.
// Pass the release key through stdin from session memory, never a source file.
import { webcrypto } from 'node:crypto';
import { CURRENT_VERSION, RELEASE_PUBLIC_KEY } from '../lib/release-config.ts';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { privateKey, record, baseUrl } = JSON.parse(input);
if (baseUrl !== 'https://guiyang-mahjong.onrender.com' || record.version !== CURRENT_VERSION || !/^[a-f0-9]{40}$/.test(record.commit)) {
  throw new Error('Release target does not match this Render checkout');
}
const get = async path => {
  const response = await fetch(baseUrl + path, { signal: AbortSignal.timeout(90000), cache: 'no-store' });
  if (!response.ok) throw new Error('Render verification failed: HTTP ' + response.status);
  return response.json();
};
const health = await get('/api/health');
if (health.status !== 'ok' || health.version !== CURRENT_VERSION || health.commit !== record.commit) {
  throw new Error('Render has not deployed the tested commit; no release record written');
}
if ((await get('/api/releases')).currentVersion !== CURRENT_VERSION) throw new Error('Release API is serving an older version');
const data = new TextEncoder().encode(JSON.stringify([record.version, record.deployedAt, record.commit]));
const key = await webcrypto.subtle.importKey('jwk', privateKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
const signature = Buffer.from(await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
const verifier = await webcrypto.subtle.importKey('jwk', RELEASE_PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
if (!await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, signature, data)) throw new Error('Release key does not match');
const response = await fetch(baseUrl + '/api/releases', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...record, signature: signature.toString('base64') }), signal: AbortSignal.timeout(30000),
});
const result = await response.json();
if (!response.ok || !result.saved) throw new Error('Render release record was not saved: ' + JSON.stringify(result));
console.log(JSON.stringify(result));
