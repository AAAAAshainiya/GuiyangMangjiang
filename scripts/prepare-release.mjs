// Run before source edits for the next release. Capture stdout in session
// memory: it contains an ephemeral private key and must never be committed.
import {webcrypto} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {CURRENT_VERSION} from '../lib/release-config.ts';
const [versionText,activity]=process.argv.slice(2),version=Number(versionText);
if(!Number.isInteger(version)||version!==CURRENT_VERSION+1||!activity||activity.length>100)throw new Error('Supply the next version and its activity');
const pair=await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const publicKey=await webcrypto.subtle.exportKey('jwk',pair.publicKey),privateKey=await webcrypto.subtle.exportKey('jwk',pair.privateKey);
writeFileSync(new URL('../lib/release-config.ts',import.meta.url),`// Release signing keys: public only; private key stays in release session memory.\nexport const CURRENT_VERSION = ${version};\nexport const CURRENT_ACTIVITY = ${JSON.stringify(activity)};\nexport const RELEASE_PUBLIC_KEY: JsonWebKey = ${JSON.stringify(publicKey)};\n`);
process.stdout.write(JSON.stringify({privateKey,version,activity}));
