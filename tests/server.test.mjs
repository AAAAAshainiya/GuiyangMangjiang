import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import * as engine from '../lib/game.ts';
import * as interaction from '../lib/interaction.ts';
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
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
const forcedCodes=[];
const interactionMod=new vm.SyntheticModule(Object.keys(interaction),function(){for(const k of Object.keys(interaction))this.setExport(k,k==='roomCode'?()=>forcedCodes.shift()??interaction.roomCode():interaction[k])});
const route=new vm.SourceTextModule(source);await route.link(s=>s==='@/db'?dbMod:s==='@/lib/interaction'?interactionMod:gameMod);await route.evaluate();
const API=route.namespace;const base='https://example.test';
async function guest(){const r=await API.GET(new Request(base+'/api/table'));assert.equal(r.status,200);const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);return cookie}
async function call(cookie,body){const r=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)}));const d=await r.json();if(r.status!==200)throw new Error(JSON.stringify(d));return d}
async function read(cookie,code){const r=await API.GET(new Request(base+'/api/table?room='+code,{headers:{cookie}}));return {status:r.status,data:await r.json()}}
const [a,b,c]=await Promise.all([guest(),guest(),guest()]);let room=await call(a,{action:'create',name:'测试房主'});const code=room.code;assert.equal(code.length,4);forcedCodes.push(code,'ZYXW');assert.equal((await call(a,{action:'create',name:'碰码测试'})).code,'ZYXW');assert.equal((await read(a,code)).data.players[0].name,'测试房主');
room=await call(b,{action:'join',name:'测试好友',code});assert.equal(room.me,1);assert.equal((await read(c,code)).status,403);
// Room chat is private, idempotent and independent of the table action version.
const messageId=crypto.randomUUID();const beforeChat=room.version;
room=await call(a,{action:'chat',code,text:'你好 😂',kind:'text',clientId:messageId});assert.equal(room.version,beforeChat);assert.equal(room.messages.length,1);assert.equal(room.messages[0].mine,true);assert.equal('sender' in room.messages[0],false);
const friendChat=(await read(b,code)).data;assert.equal(friendChat.messages[0].content,'你好 😂');assert.equal(friendChat.messages[0].mine,false);
room=await call(a,{action:'chat',code,text:'你好 😂',kind:'text',clientId:messageId});assert.equal(room.messages.length,1,'retry does not duplicate');
await assert.rejects(call(a,{action:'chat',code,text:'太快',kind:'text',clientId:crypto.randomUUID()}),/发送太快/);
await assert.rejects(call(c,{action:'chat',code,text:'跨房间',kind:'text',clientId:crypto.randomUUID()}),/请先加入/);
await assert.rejects(call(b,{action:'chat',code,text:'字'.repeat(101),kind:'text',clientId:crypto.randomUUID()}),/100/);
await assert.rejects(call(b,{action:'chat',code,text:'不是表情',kind:'emoji',clientId:crypto.randomUUID()}),/表情/);
room=await call(b,{action:'chat',code,text:'👍',kind:'emoji',clientId:crypto.randomUUID()});assert.equal(room.messages.length,2);
const foreign=await call(c,{action:'create',name:'另一桌'});assert.equal((await read(c,foreign.code)).data.messages.length,0);
room=await call(a,{action:'fill',code});assert.equal(room.players.length,4);assert.equal(room.players.filter(p=>p.bot).length,2);
// All nine targeted interactions use a separate cooldown and retry-safe ledger.
const interactionVersion=room.version,existingChat=room.messages.length;
for(const effect of interaction.INTERACTIONS){
 sqlite.prepare("UPDATE mahjong_chat SET at = at - 3100 WHERE code = ? AND kind = 'interaction'").run(code);
 const clientId=crypto.randomUUID();room=await call(a,{action:'interaction',code,effect:effect.id,target:2,clientId});
 assert.equal(room.version,interactionVersion);assert.equal(room.messages.length,existingChat);
 assert.equal(room.interactions.at(-1).effect,effect.id);assert.equal(room.interactions.at(-1).target,2);assert.equal(room.interactions.at(-1).seat,0);
 assert.equal('sender' in room.interactions.at(-1),false);assert.equal('targetId' in room.interactions.at(-1),false);
 const count=room.interactions.length;room=await call(a,{action:'interaction',code,effect:effect.id,target:2,clientId});assert.equal(room.interactions.length,count);
}
assert.equal(room.interactions.length,9);assert.equal((await read(b,code)).data.interactions.length,9);
await assert.rejects(call(a,{action:'interaction',code,effect:'tomato',target:1,clientId:crypto.randomUUID()}),/3 秒/);
for(const target of [0,-1,4,1.5])await assert.rejects(call(a,{action:'interaction',code,effect:'egg',target,clientId:crypto.randomUUID()}),/头像/);
await assert.rejects(call(a,{action:'interaction',code,effect:'unknown',target:1,clientId:crypto.randomUUID()}),/头像/);
await assert.rejects(call(c,{action:'interaction',code,effect:'egg',target:1,clientId:crypto.randomUUID()}),/请先加入/);
const parallel=await Promise.allSettled([call(b,{action:'interaction',code,effect:'flower',target:0,clientId:crypto.randomUUID()}),call(b,{action:'interaction',code,effect:'tea',target:0,clientId:crypto.randomUUID()})]);assert.equal(parallel.filter(x=>x.status==='fulfilled').length,1,'atomic interaction cooldown');
// Animation retention cannot evict the independent hundred-message chat history.
for(let i=0;i<45;i++)sqlite.prepare('INSERT INTO mahjong_chat (id,code,sender,client_id,name,kind,content,at) VALUES (?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),code,a.split('=')[1],crypto.randomUUID(),'测试房主','interaction',JSON.stringify({effect:'egg',target:1}),Date.now()-10000+i);
sqlite.prepare("UPDATE mahjong_chat SET at = at - 3100 WHERE code = ? AND kind = 'interaction'").run(code);
room=await call(a,{action:'interaction',code,effect:'redpacket',target:1,clientId:crypto.randomUUID()});assert.equal(room.interactions.length,40);assert.equal(room.messages.length,existingChat);assert.equal(room.version,interactionVersion);
// A legacy room remains joinable and keeps its original key, scores and phase.
const legacy=engine.create('ABCDEFGH',a.split('=')[1],'旧房主');sqlite.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,0,?)').run(legacy.code,JSON.stringify(legacy),Date.now());
assert.equal((await read(a,legacy.code)).status,200);assert.equal((await call(b,{action:'join',code:legacy.code,name:'旧房好友'})).code,legacy.code);
await Promise.all([call(a,{action:'ready',code}),call(b,{action:'ready',code})]);room=await call(a,{action:'start',code});assert.equal(room.phase,'play');assert.equal(room.players[0].hand.length,14);assert.equal(room.players[1].hand.length,0);
const other=(await read(b,code)).data;assert.equal(other.players[0].hand.length,0);assert.equal(other.players[1].hand.length,13);
room=(await read(a,code)).data;const tile=room.players[0].hand[0];
sqlite.prepare('UPDATE mahjong_chat SET at = at - 2000 WHERE code = ?').run(code);
const results=await Promise.allSettled([call(a,{action:'discard',code,tile,version:room.version}),call(a,{action:'discard',code,tile,version:room.version})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'duplicate concurrent action only commits once');
const afterPlay=(await read(a,code)).data;const turnBefore=afterPlay.turn,versionBefore=afterPlay.version;
room=await call(a,{action:'chat',code,text:'消息不出牌',kind:'text',clientId:crypto.randomUUID()});assert.equal(room.turn,turnBefore);assert.equal(room.version,versionBefore);assert.equal(room.messages.length,3);
// Retention is bounded to 100 messages, including when historical messages already exist.
const sender=b.split('=')[1];for(let i=0;i<105;i++)sqlite.prepare('INSERT INTO mahjong_chat (id,code,sender,client_id,name,kind,content,at) VALUES (?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),code,sender,crypto.randomUUID(),'测试好友','text','旧消息'+i,Date.now()-10000+i);
sqlite.prepare('UPDATE mahjong_chat SET at = at - 2000 WHERE code = ?').run(code);
room=await call(b,{action:'chat',code,text:'最新消息',kind:'text',clientId:crypto.randomUUID()});assert.equal(room.messages.length,100);assert.equal(room.messages.at(-1).content,'最新消息');
await call(b,{action:'leave',code});const after=(await read(a,code)).data;assert.equal(after.players[1].bot,true);await call(a,{action:'leave',code});
let lobby=await call(a,{action:'create',name:'原房主'});await call(a,{action:'leave',code:lobby.code});lobby=await call(b,{action:'join',code:lobby.code,name:'新房主'});assert.equal(lobby.isHost,true);
const malicious=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie:a,origin:'https://evil.test'},body:JSON.stringify({action:'create',name:'Evil'})}));assert.equal(malicious.status,403);
console.log('PASS: real SQLite routes; room chat privacy, emoji/text, retry deduplication, cooldown, length validation, 100-message retention, independent play version; room operations, hidden hands and CSRF.');
