import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import * as engine from '../lib/game.ts';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('drizzle/0000_needy_ender_wiggin.sql','utf8'));
const DB = {
 prepare(sql) {
  return {bind(...args) {
   const s=sqlite.prepare(sql);
   return {
    async first(){return s.get(...args)??null},
    async all(){return {results:s.all(...args)}},
    async run(){const r=s.run(...args);return {meta:{changes:r.changes}}}
   };
  }};
 }
};
const dbMod=new vm.SyntheticModule(['db'],function(){this.setExport('db',()=>DB)});
const gameMod=new vm.SyntheticModule(Object.keys(engine),function(){for(const k of Object.keys(engine))this.setExport(k,engine[k])});
const source=ts.transpileModule(fs.readFileSync('app/api/table/route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
const route=new vm.SourceTextModule(source);await route.link(s=>s==='@/db'?dbMod:gameMod);await route.evaluate();
const API=route.namespace;const base='https://example.test';
async function guest(){const r=await API.GET(new Request(base+'/api/table'));assert.equal(r.status,200);const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);return cookie}
async function call(cookie,body){const r=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)}));const d=await r.json();if(r.status!==200)throw new Error(JSON.stringify(d));return d}
async function read(cookie,code){const r=await API.GET(new Request(base+'/api/table?room='+code,{headers:{cookie}}));return {status:r.status,data:await r.json()}}
const [a,b,c]=await Promise.all([guest(),guest(),guest()]);let room=await call(a,{action:'create',name:'测试房主'});const code=room.code;
room=await call(b,{action:'join',name:'测试好友',code});assert.equal(room.me,1);assert.equal((await read(c,code)).status,403);
room=await call(a,{action:'fill',code});assert.equal(room.players.length,4);assert.equal(room.players.filter(p=>p.bot).length,2);
await Promise.all([call(a,{action:'ready',code}),call(b,{action:'ready',code})]);room=await call(a,{action:'start',code});assert.equal(room.phase,'play');assert.equal(room.players[0].hand.length,14);assert.equal(room.players[1].hand.length,0);
const other=(await read(b,code)).data;assert.equal(other.players[0].hand.length,0);assert.equal(other.players[1].hand.length,13);
room=(await read(a,code)).data;const tile=room.players[0].hand[0];
const results=await Promise.allSettled([call(a,{action:'discard',code,tile,version:room.version}),call(a,{action:'discard',code,tile,version:room.version})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'duplicate concurrent action only commits once');
await call(b,{action:'leave',code});const after=(await read(a,code)).data;assert.equal(after.players[1].bot,true);await call(a,{action:'leave',code});
let lobby=await call(a,{action:'create',name:'原房主'});await call(a,{action:'leave',code:lobby.code});lobby=await call(b,{action:'join',code:lobby.code,name:'新房主'});assert.equal(lobby.isHost,true);
const malicious=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie:a,origin:'https://evil.test'},body:JSON.stringify({action:'create',name:'Evil'})}));assert.equal(malicious.status,403);
console.log('PASS: server routes with real SQLite; guest sessions, two-player room, bot fill, concurrent ready/discard, private hands, access denial, CSRF, bot takeover, empty-room host reassignment.');
