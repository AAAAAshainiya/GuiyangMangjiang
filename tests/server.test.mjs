import {loader} from './account-v32-loader.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import * as engine from '../lib/game.ts';
import * as interaction from '../lib/interaction.ts';
const sqlite=new DatabaseSync(':memory:');for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
let failVisibleOnce=false;
const DB = {
 prepare(sql) {
  return {bind(...args) {
   const s=sqlite.prepare(sql);
   return {
    async first(){return s.get(...args)??null},
    async all(){if(failVisibleOnce&&sql.startsWith('SELECT id, sender')){failVisibleOnce=false;throw new Error('simulated response loss after commit')}return {results:s.all(...args)}},
    async run(){const r=s.run(...args);return {meta:{changes:r.changes}}}
   };
  }};
 }
};
DB.batch=async statements=>{const out=[];for(const st of statements)out.push(await st.run());return out};
const accountLoad=loader({'@/db':{db:()=>DB},'cloudflare:workers':{env:{DB,BUCKET:{put:async()=>({})}}}});
const accountServer=await accountLoad('lib/account-server.ts'),recordServer=await accountLoad('lib/account-records.ts');
const accountMod=new vm.SyntheticModule(Object.keys(accountServer),function(){for(const k of Object.keys(accountServer))this.setExport(k,accountServer[k])});
const recordMod=new vm.SyntheticModule(Object.keys(recordServer),function(){for(const k of Object.keys(recordServer))this.setExport(k,recordServer[k])});
const dbMod=new vm.SyntheticModule(['db'],function(){this.setExport('db',()=>DB)});
const gameMod=new vm.SyntheticModule(Object.keys(engine),function(){for(const k of Object.keys(engine))this.setExport(k,engine[k])});
const source=ts.transpileModule(fs.readFileSync('app/api/table/route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
const forcedCodes=[];
const interactionMod=new vm.SyntheticModule(Object.keys(interaction),function(){for(const k of Object.keys(interaction))this.setExport(k,k==='roomCode'?()=>forcedCodes.shift()??interaction.roomCode():interaction[k])});
const route=new vm.SourceTextModule(source);await route.link(s=>s==='@/lib/account-server'?accountMod:s==='@/lib/account-records'?recordMod:s==='@/db'?dbMod:s==='@/lib/interaction'?interactionMod:gameMod);await route.evaluate();
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
await Promise.all([call(a,{action:'ready',code}),call(b,{action:'ready',code})]);const priorRandom=crypto.getRandomValues;crypto.getRandomValues=function(array){priorRandom.call(crypto,array);array[0]-=array[0]%4;return array};try{room=await call(a,{action:'start',code})}finally{crypto.getRandomValues=priorRandom}assert.equal(room.phase,'play');assert.equal(room.players[0].hand.length,14);assert.equal(room.players[1].hand.length,0);
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

// v12: heartbeat revisions, atomic receipts and same-claim concurrency.
const [d,e,f,g]=await Promise.all([guest(),guest(),guest(),guest()]);
let stable=await call(d,{action:'create',name:'稳定测试'}),stableCode=stable.code;
const stored=()=>JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code = ?').get(stableCode).state);
function storeRoom(r){sqlite.prepare('UPDATE mahjong_rooms SET state = ?, updated = ? WHERE code = ?').run(JSON.stringify(r),Date.now(),r.code)}
let rs=stored();rs.players[0].seen=Date.now()-20000;storeRoom(rs);
const heartbeat=(await read(d,stableCode)).data;
assert.equal(heartbeat.version,stable.version,'online heartbeat preserves logical play version');
assert.equal(heartbeat.revision,stable.revision+1,'heartbeat still atomically updates storage revision');
const readyBody={action:'ready',code:stableCode,version:stable.version,context:stable.actionContext,clientId:crypto.randomUUID()};
const concurrent=await Promise.all([call(d,readyBody),call(d,readyBody),call(d,readyBody)]);
assert(concurrent.every(x=>x.actionAck.status==='applied'));
stable=(await read(d,stableCode)).data;assert.equal(stable.players[0].ready,true);assert.equal(stable.version,heartbeat.version+1,'same ID cannot toggle readiness twice');
assert(!JSON.stringify(stable).includes('actionReceipts'),'private receipts never appear in normal views');
await assert.rejects(call(d,{...readyBody,action:'fill'}),/操作编号已经使用/);
const response=async(cookie,body)=>{const r=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()}};
const stale=await response(d,{action:'fill',code:stableCode,version:heartbeat.version,clientId:crypto.randomUUID()});
assert.equal(stale.status,409);assert.equal(stale.data.code,'STATE_CHANGED');assert.equal(stale.data.state.version,stable.version);
// A response can fail after its atomic mutation already committed.
const lost={action:'ready',code:stableCode,version:stable.version,clientId:crypto.randomUUID()};
failVisibleOnce=true;const lostReply=await response(d,lost);assert.equal(lostReply.status,500);
const ack=async(cookie,code,id)=>{const r=await API.GET(new Request(base+'/api/table?room='+code+'&actionId='+id,{headers:{cookie}}));return {status:r.status,data:await r.json()}};
const recovered=await ack(d,stableCode,lost.clientId);assert.equal(recovered.data.actionAck.status,'applied');assert.equal(recovered.data.players[0].ready,false);
const replay=await call(d,lost);assert.equal(replay.players[0].ready,false);assert.equal(replay.version,recovered.data.version);
await call(e,{action:'join',code:stableCode,name:'另一位'});
assert.equal((await ack(e,stableCode,lost.clientId)).data.actionAck.status,'not_found','receipts belong only to the original actor');
assert.equal((await call(d,{action:'join',code:stableCode,name:'重复加入'})).me,0,'rejoin restores the original guest seat');
assert.equal((await read(d,stableCode)).data.players[0].name,'稳定测试');
// Two seats answer one unchanged claim using their original snapshots.
const race=engine.create('RACE',d.split('=')[1],'出牌者');race.players=[d,e,f,g].map((cookie,i)=>engine.player(cookie.split('=')[1],'并发'+i));
race.phase='play';race.round=1;race.scoringVersion=3;race.version=0;race.playVersion=0;race.turn=0;race.wall=[13,14,15,16];race.deadline=Date.now()+60000;race.drawn=18;race.drawnIndex=13;
race.players[0].hand=[0,1,2,3,4,5,6,7,8,9,10,11,12,18];
race.players[1].hand=[19,20,21,22,23,21,22,23,24,25,26,26,26];
race.players[2].hand=[18,18,0,0,2,2,4,4,6,6,8,8,10];
race.players[3].hand=[1,1,3,3,5,5,7,7,9,9,10,11,12];
engine.act(race,0,'discard',18,Date.now());assert.equal(race.phase,'claim');assert.deepEqual(Object.keys(race.claim.choices),['1','2']);
sqlite.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,0,?)').run(race.code,JSON.stringify(race),Date.now());
const [huView,pengView]=await Promise.all([read(e,race.code),read(f,race.code)]);
assert(huView.data.options.includes('hu'));assert(pengView.data.options.includes('peng'));
const bodies=[{action:'peng',code:race.code,version:pengView.data.version,context:pengView.data.actionContext,clientId:crypto.randomUUID()},{action:'hu',code:race.code,version:huView.data.version,context:huView.data.actionContext,clientId:crypto.randomUUID()}];
await Promise.all([call(f,bodies[0]),call(e,bodies[1])]);
const final=(await read(d,race.code)).data;assert.equal(final.phase,'done');assert.equal(final.result.winner,1,'hu retains priority over simultaneous peng');assert.equal(final.version,2);
const scores=final.players.map(p=>p.score);await Promise.all([call(f,bodies[0]),call(e,bodies[1])]);assert.deepEqual((await read(d,race.code)).data.players.map(p=>p.score),scores,'repeated acknowledgments cannot settle twice');
// A different concealed draw cannot leak into an observer's action context.
const secret=engine.create('SAFE',d.split('=')[1],'观察者');secret.players=[d,e].map((cookie,i)=>engine.player(cookie.split('=')[1],'隐私'+i));secret.turn=1;secret.drawn=23;secret.drawnIndex=12;
const contextBefore=engine.view(secret,d.split('=')[1]).actionContext;secret.drawn=26;secret.drawnIndex=2;assert.equal(engine.view(secret,d.split('=')[1]).actionContext,contextBefore);
const leaveBody={action:'leave',code:stableCode,version:(await read(d,stableCode)).data.version,clientId:crypto.randomUUID()};await call(d,leaveBody);assert.equal((await ack(d,stableCode,leaveBody.clientId)).data.left,true);assert.equal((await call(d,leaveBody)).left,true);
console.log('PASS: v12 real SQLite heartbeat separation, atomic action deduplication, post-commit response loss, private acknowledgments, immediate stale-state snapshot, seat restoration, concurrent claim priority, one settlement and leave confirmation.');
// v13: room-wide speed, remembered profile, managed control and historical bills.
let mode=await call(d,{action:'create',name:'资料测试',avatar:'🐯'});const modeCode=mode.code;assert.equal(mode.players[0].avatar,'🐯');
const profileBody={action:'profile',code:modeCode,name:'新昵称',avatar:'🦊',version:mode.version,clientId:crypto.randomUUID()};mode=await call(d,profileBody);const profileVersion=mode.version;mode=await call(d,profileBody);assert.equal(mode.version,profileVersion);assert.equal(mode.players[0].name,'新昵称');assert.equal(mode.players[0].avatar,'🦊');
await call(e,{action:'join',code:modeCode,name:'好友'});await assert.rejects(call(e,{action:'speed',code:modeCode,tile:1}),/只有房主/);
mode=await call(d,{action:'speed',code:modeCode,tile:1});assert.equal(mode.fast,true);assert.equal((await read(e,modeCode)).data.fast,true);await call(e,{action:'leave',code:modeCode});await call(d,{action:'fill',code:modeCode});await call(d,{action:'ready',code:modeCode});mode=await call(d,{action:'start',code:modeCode});
assert.equal(mode.botDelay,500);assert.equal(mode.turn,mode.dealer);assert.equal(mode.players[mode.dealer].count,14);await assert.rejects(call(d,{action:'speed',code:modeCode,tile:0}),/下一局/);
for(let step=0;step<600&&mode.phase!=='done';step++){if(!(mode.phase==='play'&&mode.turn===mode.me||mode.phase==='claim'&&mode.options.length>0)){const persisted=JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code = ?').get(modeCode).state);persisted.deadline=Date.now()-1;sqlite.prepare('UPDATE mahjong_rooms SET state = ? WHERE code = ?').run(JSON.stringify(persisted),modeCode);mode=(await read(d,modeCode)).data;continue}let action,tile;const k=mode.options.find(o=>o.startsWith('gang:')||o.startsWith('bu:'));if(mode.options.includes('hu'))action='hu';else if(mode.phase==='claim')action=mode.options[0];else if(k){const parts=k.split(':');action=parts[0];tile=Number(parts[1])}else{action='discard';tile=mode.suggestion}mode=await call(d,{action,code:modeCode,tile,version:mode.version,context:mode.actionContext,clientId:crypto.randomUUID()})}
assert.equal(mode.phase,'done');assert.equal(mode.completedRounds,1);assert.equal(mode.history.length,1);assert.equal(mode.roundSummaries.length,1);assert(mode.history[0].bill);const nextDealer=mode.dealer,endDelta=[...mode.result.delta],endScores=mode.players.map(p=>p.score);assert.deepEqual(mode.roundSummaries[0].delta,endDelta);
const readyNext={action:'ready',code:modeCode,version:mode.version,clientId:crypto.randomUUID()};mode=await call(d,readyNext);assert.equal(mode.players[0].ready,true);mode=await call(d,readyNext);assert.equal(mode.players[0].ready,true);mode=await call(d,{action:'start',code:modeCode});assert.equal(mode.round,2);assert.equal(mode.dealer,nextDealer);assert.equal(mode.turn,nextDealer);assert.deepEqual(mode.players.map(p=>p.score),endScores);assert.deepEqual(mode.history[0].bill.result.delta,endDelta,'next start retains exact historical settlement');assert.deepEqual((await read(d,modeCode)).data.history[0].bill.result.delta,endDelta);
const auto=engine.create('AUTO',d.split('=')[1],'自动恢复');auto.players=[d,e,f,g].map((cookie,i)=>engine.player(cookie.split('=')[1],'恢复'+i));auto.phase='play';auto.round=1;auto.turn=0;auto.deadline=Date.now()-10;auto.wall=[1,2,3];auto.players[0].hand=[25];auto.players.slice(1).forEach(p=>p.hand=[0,1,2,3,4,5,6,7,8,9,10,11,12]);
sqlite.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,0,?)').run(auto.code,JSON.stringify(auto),Date.now());let controlled=(await read(d,auto.code)).data;assert.equal(controlled.players[0].managed,true);assert.equal(controlled.players[0].autoMoves,1);assert.deepEqual(controlled.options,[]);
const resume={action:'resume',code:auto.code,version:controlled.version,clientId:crypto.randomUUID()};controlled=await call(d,resume);assert.equal(controlled.players[0].managed,false);const resumedVersion=controlled.version;controlled=await call(d,resume);assert.equal(controlled.version,resumedVersion);assert.equal(controlled.players[0].autoMoves,1);
console.log('PASS: v13 real SQLite profile dedup/avatar persistence, host-only shared speed, 500 ms human-safe bot progression, historical bills across next round/refresh and managed resume exactly once.');

// Older queued v12 operations retain their original five-field receipt signature.
const oldId=crypto.randomUUID(),oldBody={action:'discard',code:modeCode,tile:0,version:0,clientId:oldId};const legacyState=JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code = ?').get(modeCode).state);legacyState.actionReceipts.push({id:oldId,player:d.split('=')[1],signature:JSON.stringify(['discard',0,0,null,null]),at:Date.now()});sqlite.prepare('UPDATE mahjong_rooms SET state = ? WHERE code = ?').run(JSON.stringify(legacyState),modeCode);assert.equal((await call(d,oldBody)).actionAck.status,'applied');
console.log('PASS: v13 preserves already-committed v12 action receipt signatures across deployment.');

// Persisted custom rules now require actual registered accounts and host authority.
const accountAPI=await accountLoad('app/api/account/route.ts');
async function accountCall(cookie,body){const res=await accountAPI.POST(new Request(base+'/api/account',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)}));const data=await res.json();assert.equal(res.status,200,JSON.stringify(data));return {cookie:res.headers.get('set-cookie')?.split(';')[0]??cookie,user:data.user}}
let registeredA=await accountCall('',{action:'register',username:'server_rules_a',password:'rules-password-A',nickname:'自定义房主'}),registeredB=await accountCall('',{action:'register',username:'server_rules_b',password:'rules-password-B',nickname:'规则好友'}),rulesA=registeredA.cookie,rulesB=registeredB.cookie;

let configured=await call(rulesA,{action:'create',name:'自定义房主'}),customRules=engine.defaultRules();
customRules.chickenTiles=[5,16];customRules.chicken=7;customRules.charge=11;customRules.flip=2;customRules.ming=6;customRules.an=8;customRules.bu=9;customRules.hot=5;customRules.hu.ping=3;customRules.hu.peng=9;
await call(rulesB,{action:'join',code:configured.code,name:'规则好友'});configured=(await read(rulesA,configured.code)).data;
let rejected=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie:rulesB},body:JSON.stringify({action:'rules',code:configured.code,rules:customRules,version:configured.version,clientId:crypto.randomUUID()})}));assert.equal(rejected.status,403);assert.match((await rejected.json()).error,/只有房主/);
registeredA=await accountCall(rulesA,{action:'rules',rules:customRules,revision:registeredA.user.revision});
const saveId=crypto.randomUUID(),ruleBody={action:'rules',code:configured.code,rules:customRules,version:configured.version,clientId:saveId};configured=await call(rulesA,ruleBody);assert.deepEqual(configured.rules,customRules);assert.equal(configured.ruleRevision,2);const ruleVersion=configured.version;
assert.deepEqual((await read(rulesB,configured.code)).data.rules,customRules);configured=await call(rulesA,ruleBody);assert.equal(configured.ruleRevision,2);assert.equal(configured.version,ruleVersion,'same rule operation must not run twice');
await assert.rejects(call(rulesA,{...ruleBody,rules:{...customRules,flip:3}}),/操作编号已经使用/);
await assert.rejects(call(rulesA,{action:'rules',code:configured.code,rules:{...customRules,chickenTiles:[27]},version:configured.version,clientId:crypto.randomUUID()}),/固定鸡牌/);
await assert.rejects(call(rulesA,{action:'rules',code:configured.code,rules:{...customRules,hot:-1},version:configured.version,clientId:crypto.randomUUID()}),/整数/);
configured=await call(rulesA,{action:'fill',code:configured.code});configured=await call(rulesA,{action:'ready',code:configured.code});configured=await call(rulesB,{action:'ready',code:configured.code});configured=await call(rulesA,{action:'start',code:configured.code});assert.deepEqual(configured.roundRules,customRules);assert.equal(configured.flipPenaltyOnlyFixed,true);
await assert.rejects(call(rulesA,{action:'rules',code:configured.code,rules:engine.defaultRules(),version:configured.version,clientId:crypto.randomUUID()}),/本局结束/);
let configuredState=JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code = ?').get(configured.code).state);configuredState.phase='play';configuredState.turn=0;configuredState.deadline=Date.now()+45000;configuredState.drawn=25;configuredState.heavenlyReady=[false,false,false,false];configuredState.players.forEach(p=>{p.hand=[1,3,5,7,8,10,12,14,15,17,19,21,23];p.melds=[];p.river=[]});configuredState.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];configuredState.players[1].river=[1];configuredState.wall=[0];
sqlite.prepare('UPDATE mahjong_rooms SET state = ? WHERE code = ?').run(JSON.stringify(configuredState),configured.code);configured=(await read(rulesA,configured.code)).data;configured=await call(rulesA,{action:'hu',code:configured.code,context:configured.actionContext,version:configured.version,clientId:crypto.randomUUID()});assert.equal(configured.result.huValues[0],3);assert.equal(configured.result.values[1],0);assert.deepEqual(configured.result.rules,customRules);const oldBill=JSON.stringify(configured.result),oldDelta=[...configured.result.delta];
registeredA=await accountCall(rulesA,{action:'resetRules',revision:registeredA.user.revision});
const afterRules=engine.defaultRules(),lostRulesId=crypto.randomUUID(),lostRulesBody={action:'rules',code:configured.code,rules:afterRules,version:configured.version,clientId:lostRulesId};failVisibleOnce=true;rejected=await API.POST(new Request(base+'/api/table',{method:'POST',headers:{'content-type':'application/json',cookie:rulesA},body:JSON.stringify(lostRulesBody)}));assert.equal(rejected.status,500);
let confirm=await API.GET(new Request(base+'/api/table?room='+configured.code+'&actionId='+lostRulesId,{headers:{cookie:rulesA}}));configured=await confirm.json();assert.equal(configured.actionAck.status,'applied');assert.deepEqual(configured.rules,afterRules);assert.equal(configured.ruleRevision,3);assert.equal(JSON.stringify(configured.result),oldBill);configured=await call(rulesA,lostRulesBody);assert.equal(configured.ruleRevision,3);assert.deepEqual(configured.history[0].bill.result.delta,oldDelta);assert.deepEqual(configured.history[0].bill.result.rules,customRules);
configured=await call(rulesA,{action:'ready',code:configured.code});configured=await call(rulesB,{action:'ready',code:configured.code});configured=await call(rulesA,{action:'start',code:configured.code});assert.deepEqual(configured.roundRules,afterRules);assert.equal(configured.roundRuleRevision,3);assert.deepEqual(configured.history[0].bill.result.rules,customRules);
console.log('PASS: real SQLite host-only configurable rules, shared refresh, invalid input/active-round rejection, same-ID replay/conflict, custom actual settlement, lost-response confirmation and unchanged historical rule snapshot.');

// Host succession is random among remaining humans, never a bot; receipts
// preserve the chosen successor across retries and only that seat gets rights.
const originalRandom=Math.random;
async function succession(choice,playing){
 const members=await Promise.all([guest(),guest(),guest()]);let table=await call(members[0],{action:'create',name:'离任房主'});const key=table.code;
 await call(members[1],{action:'join',code:key,name:'第一位真人'});await call(members[2],{action:'join',code:key,name:'第二位真人'});await call(members[0],{action:'fill',code:key});
 if(playing){for(const member of members)await call(member,{action:'ready',code:key});table=await call(members[0],{action:'start',code:key})}
 Math.random=()=>choice;
 const body={action:'leave',code:key,version:(await read(members[0],key)).data.version,clientId:crypto.randomUUID()};assert.equal((await call(members[0],body)).left,true);
 const selected=choice===0?1:2,other=selected===1?2:1,after=(await read(members[selected],key)).data;assert.equal(after.isHost,true);assert.equal((await read(members[other],key)).data.isHost,false);assert(after.logs.some(s=>s.includes((selected===1?'第一位真人':'第二位真人')+'成为新房主')));
 const stored=JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code=?').get(key).state);assert.equal(stored.host,members[selected].split('=')[1]);assert(!stored.players.find(p=>p.id===stored.host).bot);if(playing){assert(stored.players[0].bot);assert.notEqual(stored.phase,'lobby')}
 await call(members[0],body);assert.equal((await read(members[selected],key)).data.isHost,true);
 if(!playing){await assert.rejects(call(members[other],{action:'speed',code:key,tile:1}),/只有房主/);assert.equal((await call(members[selected],{action:'speed',code:key,tile:1})).fast,true)}
 return {members,key};
}
try{
 await succession(0,false);await succession(.999,false);await succession(.999,true);
 const members=await Promise.all([guest(),guest()]);const table=await call(members[0],{action:'create',name:'最后真人'});await call(members[0],{action:'fill',code:table.code});await call(members[0],{action:'leave',code:table.code});assert.equal(JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code=?').get(table.code).state).host,'');assert.equal((await call(members[1],{action:'join',code:table.code,name:'后来真人'})).isHost,true);
}finally{Math.random=originalRandom}
console.log('PASS: real API randomly selects either remaining human, excludes bots during play/lobby, synchronizes host rights, retries the same leave without reselection and recovers all-bot rooms.');

// v25: host-only termination/kicking, stable confirmation and kicked-session exit.
const put=r=>sqlite.prepare('UPDATE mahjong_rooms SET state=?,version=?,updated=? WHERE code=?').run(JSON.stringify(r),r.version??0,Date.now(),r.code);
const get=code=>JSON.parse(sqlite.prepare('SELECT state FROM mahjong_rooms WHERE code=?').get(code).state);
async function managedTable(){const people=await Promise.all([guest(),guest(),guest(),guest()]);let v=await call(people[0],{action:'create',name:'管理房主'});for(let i=1;i<4;i++)v=await call(people[i],{action:'join',name:'牌友'+i,code:v.code});return {people,code:v.code}}
for(const phase of ['play','claim']){
 const {people,code:key}=await managedTable();let r=get(key);r.players.forEach((p,i)=>{p.ready=true;p.score=[20,-8,3,-15][i]});engine.start(r,Date.now());r.deadline=Date.now()+60000;
 r.beans=[12,-4,-4,-4];r.beanValues=[4,0,0,0];r.beanTransfers=[1,2,3].map(from=>({from,to:0,points:4}));r.beanEvents=[{seat:0,type:'an',tile:3,payers:[1,2,3],unit:4}];r.players[1].hand=[0,1,2,3,4,5,9,10,11,18,18,18,6];
 if(phase==='claim'){r.phase='claim';r.claim={from:0,t:6,rob:false,choices:{1:['hu'],2:['peng']},answers:{}}}put(r);
 const v=(await read(people[0],key)).data,body={action:'terminate',code:key,round:v.round,version:v.version,clientId:crypto.randomUUID()};
 assert.equal((await response(people[1],body)).status,403);
 const cannotKick=await response(people[0],{action:'kick',code:key,tile:1,version:v.version,clientId:crypto.randomUUID()});assert.equal(cannotKick.status,400);assert.match(cannotKick.data.error,/对局中不能踢人/);
 const dealer=r.dealer,points=r.players.map(p=>p.score);if(phase==='play'){failVisibleOnce=true;assert.equal((await response(people[0],body)).status,500);assert.equal((await ack(people[0],key,body.clientId)).data.actionAck.status,'applied')}const stopped=await call(people[0],body);assert.equal(stopped.phase,'done');assert(stopped.result.terminated);assert.equal(stopped.result.kind,'房主终止');assert.equal(stopped.result.flip,null);assert.equal(stopped.dealer,dealer);assert(stopped.result.delta.every(n=>n===0));assert(stopped.result.beans.every(n=>n===0));assert(stopped.result.hu.every(n=>n===0));assert(stopped.result.chicken.every(n=>n===0));assert.deepEqual(stopped.players.map(p=>p.score),points);assert.equal(stopped.claim,null);assert.equal(stopped.deadline,0);assert.equal(stopped.history.length,1);assert(stopped.history[0].bill.result.terminated);assert.equal(stopped.players[1].hand.length,0,'termination cannot expose a ready opponent hand');assert(stopped.players.every(p=>!p.revealed));
 assert.deepEqual((await call(people[0],body)).players.map(p=>p.score),points);assert.equal(get(key).history.length,1,'retry does not duplicate termination/history');
 const oldBill=JSON.stringify(get(key).history);const kick={action:'kick',code:key,tile:1,version:stopped.version,round:stopped.round,clientId:crypto.randomUUID()};if(phase==='play'){failVisibleOnce=true;assert.equal((await response(people[0],kick)).status,500);assert.equal((await ack(people[0],key,kick.clientId)).data.actionAck.status,'applied')}const kicked=await call(people[0],kick);assert.equal(kicked.phase,'lobby');assert.equal(kicked.players.length,3);assert.deepEqual(kicked.players.map(p=>p.score),[20,3,-15]);assert.equal(JSON.stringify(get(key).history),oldBill,'seat removal cannot rewrite the completed bill');
 assert.equal((await call(people[0],kick)).players.length,3,'same target index must not remove the shifted next player on retry');
 const removed=await read(people[1],key);assert.equal(removed.status,200);assert(removed.data.left&&removed.data.kicked);assert.equal(removed.data.message,'你已被房主移出房间');assert(!('players' in removed.data));assert((await call(people[1],{action:'ready',code:key})).kicked);
 assert(!JSON.stringify(kicked).includes(people[1].split('=')[1]),'kicked guest token is private');assert(!('kicked' in kicked));
 for(const cookie of [people[0],people[2],people[3]]){const snapshot=(await read(cookie,key)).data;assert(snapshot.players.every(p=>p.name!=='牌友1'))}
 await call(people[0],{action:'fill',code:key});for(const cookie of [people[0],people[2],people[3]])await call(cookie,{action:'ready',code:key});const ready=get(key);ready.players.forEach(p=>p.ready=true);put(ready);const again=await call(people[0],{action:'start',code:key});assert.equal(again.round,2);assert.deepEqual(again.players.map(p=>p.score),[20,3,-15,0]);assert.equal(again.history.length,1);
 const oldStop=await response(people[0],{...body,clientId:crypto.randomUUID()});assert.equal(oldStop.status,409);assert.equal((await read(people[0],key)).data.phase,'play','old round confirmation cannot end the next round');
}
{
 const {people,code:key}=await managedTable();let v=(await read(people[0],key)).data;
 assert.equal((await response(people[1],{action:'kick',code:key,tile:2,version:v.version,clientId:crypto.randomUUID()})).status,403);
 for(const tile of [0,-1,4,1.5])assert.equal((await response(people[0],{action:'kick',code:key,tile,version:v.version,clientId:crypto.randomUUID()})).status,400);
 const parallel=await Promise.all([response(people[0],{action:'kick',code:key,tile:1,version:v.version,clientId:crypto.randomUUID()}),response(people[0],{action:'kick',code:key,tile:2,version:v.version,clientId:crypto.randomUUID()})]);assert.equal(parallel.filter(x=>x.status===200).length,1);assert.equal(parallel.filter(x=>x.status===409).length,1);assert.equal(get(key).players.length,3);
 const removed=people.find((cookie,i)=>i>0&&!get(key).players.some(p=>p.id===cookie.split('=')[1]));assert(removed);const rejoined=await call(removed,{action:'join',name:'重新入座',code:key});assert.equal(rejoined.players.length,4);assert.equal((await read(removed,key)).data.left,undefined,'explicit rejoining clears the prior removal notice');
}
// Termination can use a stale play version within the same round, but a
// concurrent winning operation and termination may commit only one outcome.
{
 const {people,code:key}=await managedTable();const r=get(key);r.players.forEach(p=>p.ready=true);engine.start(r,Date.now());r.turn=1;r.drawn=25;r.drawnIndex=13;r.deadline=Date.now()+60000;r.players[1].hand=[0,1,2,3,4,5,9,10,11,18,18,18,25,25];put(r);
 const host=(await read(people[0],key)).data,winning=(await read(people[1],key)).data;assert(winning.options.includes('hu'));
 const result=await Promise.all([response(people[0],{action:'terminate',code:key,round:host.round,version:host.version,clientId:crypto.randomUUID()}),response(people[1],{action:'hu',code:key,version:winning.version,context:winning.actionContext,clientId:crypto.randomUUID()})]);assert.equal(result.filter(x=>x.status===200).length,1);const final=get(key);assert.equal(final.history.length,1);assert.equal(final.phase,'done');assert.equal(final.result.delta.reduce((a,b)=>a+b),0);
}
console.log('PASS: v25 actual SQLite host authority, play/claim termination with zero chicken/beans/hu, hidden hands and immutable bills, termination/hu race, kick timing/self/target validation, same-ID and competing kick safety, kicked GET/POST and rejoin, other-seat synchronization and subsequent round preservation.');

{const host=await guest();let room=await call(host,{action:'create',name:'黔灵阿青'});
 room=await call(host,{action:'fill',code:room.code,version:room.version,clientId:crypto.randomUUID()});assert.equal(new Set(room.players.map(p=>p.name)).size,4);assert.equal(new Set(room.players.filter(p=>p.bot).map(p=>p.name)).size,3);
 for(let n=0;n<5;n++){room=await call(host,{action:'kick',code:room.code,tile:1,version:room.version,round:room.round,clientId:crypto.randomUUID()});const kept=room.players.map(p=>p.name);room=await call(host,{action:'fill',code:room.code,version:room.version,clientId:crypto.randomUUID()});assert.equal(new Set(room.players.map(p=>p.name)).size,4);assert(kept.every(name=>room.players.some(p=>p.name===name)));}
 console.log('PASS: v27 actual SQLite fill avoids existing human/bot names, repeated kick/refill stays unique and does not rename existing seats.');}

// v28 optional self-draw uses the same atomic receipt and action-context safeguards.
const skipRoom=engine.create('SKIP',d.split('=')[1],'自摸选择');skipRoom.players=[d,e,f,g].map((cookie,i)=>engine.player(cookie.split('=')[1],'选择'+i));skipRoom.phase='play';skipRoom.round=1;skipRoom.turn=0;skipRoom.drawn=16;skipRoom.wall=[17,25];skipRoom.deadline=Date.now()+45000;skipRoom.players[0].hand=[0,1,2,3,4,5,10,11,12,21,22,23,16,16];skipRoom.players.slice(1).forEach(p=>p.hand=[0,2,4,6,8,9,11,13,15,18,20,22,24]);sqlite.prepare('INSERT INTO mahjong_rooms (code,state,version,updated) VALUES (?,?,0,?)').run(skipRoom.code,JSON.stringify(skipRoom),Date.now());
const beforeSkip=(await read(d,skipRoom.code)).data;assert(beforeSkip.options.includes('skipHu'));const skipBody={action:'skipHu',code:skipRoom.code,version:beforeSkip.version,context:beforeSkip.actionContext,clientId:crypto.randomUUID()};const afterSkip=await call(d,skipBody);assert.equal(afterSkip.phase,'play');assert.equal(afterSkip.turn,0);assert(!afterSkip.options.includes('hu'));assert(afterSkip.options.includes('discard'));assert.equal(afterSkip.players[0].count,14);assert.equal((await call(d,skipBody)).version,afterSkip.version);assert.notEqual(afterSkip.actionContext,beforeSkip.actionContext);const staleHu=await response(d,{action:'hu',code:skipRoom.code,version:beforeSkip.version,context:beforeSkip.actionContext,clientId:crypto.randomUUID()});assert.equal(staleHu.status,409);assert.equal(staleHu.data.code,'STATE_CHANGED');assert.equal((await read(e,skipRoom.code)).data.players[0].hand.length,0);console.log('PASS: v28 actual SQLite decline-hu retains discard turn/hand, clears hu, same-ID replay and stale-hu rejection, observer hand privacy.');
// v34 logout leave is guarded against a simultaneous deal, retry-safe, and transfers host.
{
 const {people,code:key}=await managedTable();const r=get(key);r.phase='lobby';put(r);
 const id=crypto.randomUUID(),left=await call(people[0],{action:'leaveForLogout',code:key,clientId:id});assert.equal(left.left,true);assert.equal((await call(people[0],{action:'leaveForLogout',code:key,clientId:id})).left,true);assert(!get(key).players.some(p=>p.id===people[0].split('=')[1]));assert(get(key).players.some(p=>p.id===get(key).host&&!p.bot));
 const active=get(key);active.players.forEach(p=>p.ready=true);while(active.players.length<4)active.players.push(engine.player('bot:'+crypto.randomUUID(),'人机',true));engine.start(active,Date.now());put(active);
 const before=JSON.stringify(get(key).players);const rejected=await response(people[1],{action:'leaveForLogout',code:key,clientId:crypto.randomUUID()});assert.equal(rejected.status,400);assert.match(rejected.data.error,/已开始/);assert.equal(JSON.stringify(get(key).players),before);
 const seat=get(key).players.findIndex(p=>p.id===people[1].split('=')[1]);const tagged=get(key);tagged.players[seat].accountId='prior-owner';put(tagged);await call(people[1],{action:'leave',code:key});assert.equal(get(key).players[seat].accountId,undefined);
}
console.log('PASS v34: actual SQLite pregame logout leave, idempotent receipt, random human host transfer, started-game rejection and detached departing account.');
