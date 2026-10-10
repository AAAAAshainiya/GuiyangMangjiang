// Production Worker smoke test: direct dispatch, no preview/browser server.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
if(!existsSync('dist/server/index.js'))throw new Error('Run npm run build first.');
const server=resolve('dist/server');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):/\.(?:m?js)$/.test(e.name)?[resolve(dir,e.name)]:[])}
const entry=resolve(server,'index.js');
const modules=[entry,...walk(server).filter(p=>p!==entry)].map(path=>({type:'ESModule',path}));
const mf=new Miniflare({modules,modulesRoot:server,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'export-smoke'},r2Buckets:['BUCKET'],assets:{directory:resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true}}});
try{
 const db=await mf.getD1Database('DB');
 for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort()){
  const statements=readFileSync('drizzle/'+f,'utf8').replaceAll('--> statement-breakpoint','').split(';').map(x=>x.trim()).filter(Boolean);
  await db.batch(statements.map(s=>db.prepare(s)));
 }
 for(const path of ['/','/solo','/learn']){const r=await mf.dispatchFetch('https://example.test'+path);assert.equal(r.status,200,path);assert.match(await r.text(),/贵阳捉鸡麻将/)}
 for(const path of ['/guiyang-logo.png','/tiles/0.webp','/tiles/26.webp','/favicon.svg']){const r=await mf.dispatchFetch('https://example.test'+path);assert.equal(r.status,200,path);assert((await r.arrayBuffer()).byteLength>0)}
 const req=(path,body,cookie='')=>mf.dispatchFetch('https://example.test'+path,{method:'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
 let r=await req('/api/account',{action:'register',username:'export_smoke',password:randomUUID(),nickname:'打包核验'});assert.equal(r.status,200,await r.clone().text());const cookie=r.headers.get('set-cookie').split(';')[0];assert((await r.json()).user);
 r=await mf.dispatchFetch('https://example.test/api/account',{headers:{cookie}});assert.equal((await r.json()).user.nickname,'打包核验');
 r=await req('/api/table',{action:'create',name:'打包核验'},cookie);assert.equal(r.status,200,await r.clone().text());let room=await r.json();assert.match(room.code,/^[A-Z0-9]{4}$/);const code=room.code;
 r=await req('/api/table',{action:'fill',code},cookie);assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).players.length,4);
 r=await mf.dispatchFetch('https://example.test/api/table');const guest=r.headers.get('set-cookie').split(';')[0];
 r=await req('/api/table',{action:'join',code,name:'好友核验'},guest);assert.equal(r.status,200,await r.clone().text());room=await r.json();assert.equal(room.players.filter(p=>!p.bot).length,2);
 console.log('PASS production Worker: 3 SSR pages, static logo/tile/favicon, six real D1 migrations, account cookies, full-bot room joining, R2 binding.');
}finally{await mf.dispose()}
