import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-01',compatibilityFlags:['nodejs_compat'],script:`import {scrypt} from 'node:crypto';export default{async fetch(){try{const hash=await new Promise((resolve,reject)=>scrypt('password-worker-check','unique-salt',32,{N:32768,r:8,p:3,maxmem:64*1024*1024},(e,key)=>e?reject(e):resolve(key.toString('hex'))));return Response.json({hash})}catch(e){return Response.json({error:e.message},{status:500})}}}`});
try{const response=await mf.dispatchFetch('https://example.test/');const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.match(body.hash,/^[a-f0-9]{64}$/);console.log('PASS: password scrypt parameters supported by real Workers runtime (workerd), 32MB working memory within isolate limit.')}finally{await mf.dispose()}
