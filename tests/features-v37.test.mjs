import assert from 'node:assert/strict';
import * as React from 'react';
import {loader} from './account-v32-loader.mjs';
const load=loader(),engine=await load('lib/game.ts'),{SoloGame}=await load('lib/solo.ts'),ui=await load('app/game-experience.tsx');
const fixture=(record=true)=>new SoloGame('重开测试','🐼',1000,false,engine.defaultRules(),record?'owner':undefined,record,false);
const total=r=>r.wall.length+r.players.reduce((n,p)=>n+p.hand.length+p.river.length+p.melds.reduce((v,m)=>v+(m.k==='gang'?4:3),0),0);
function finish(g,now=5000){
 // A genuine self draw provides a nonzero, archived bill and complete replay.
 g.room.phase='play';g.room.turn=0;g.room.players[0].melds=[];g.room.players[0].hand=[0,1,2,3,4,5,9,10,11,18,19,20,8,8];g.room.drawn=8;g.room.declinedHu=false;
 g.human('hu',undefined,now);assert.equal(g.room.phase,'done');assert.notEqual(g.room.players[0].score,0);return g.room.history.at(-1);
}
for(const record of [false,true]){
 const g=fixture(record);g.human('restart',undefined,1100);assert.equal(g.room.round,1);assert.equal(total(g.room),108);assert.equal(g.room.completedRounds,0);
 const abandoned=new Set();
 for(const phase of ['play','claim','play','claim']){
  g.room.phase=phase;g.room.claim=phase==='claim'?{from:1,t:0,choices:{0:['peng']},answers:{}}:null;
  if(phase==='claim')g.pause(1200);else g.room.beans=[12,-4,-4,-4];
  const oldId=g.room.roundId,oldReplay=g.room.replay?.id;abandoned.add(oldReplay);g.human('restart',undefined,2000);
  assert.notEqual(g.room.roundId,oldId);assert.equal(g.snapshot().roundId,g.room.roundId);assert.equal(g.room.round,1);assert.equal(g.room.completedRounds,0);assert.equal(g.room.history.length,0);assert.equal(g.room.roundSummaries.length,0);
  assert.equal(g.room.result,null);assert.equal(g.room.claim,null);assert.equal(g.pausedAt,null);assert.equal(g.pauseReason,null);assert.equal(total(g.room),108);assert.deepEqual(g.room.beans,[0,0,0,0]);assert(g.room.players.every(p=>p.score===0&&!p.managed));
  if(record){assert(g.room.replay);assert.equal(g.room.replay.complete,false);assert.notEqual(g.room.replay.id,oldReplay)}else assert.equal(g.room.replay,undefined);
 }
 const bill=finish(g),saved=JSON.stringify(bill),scores=g.room.players.map(p=>p.score);assert.equal(g.room.completedRounds,1);assert.equal(g.room.history.length,1);
 g.room.accountSavedRounds=[bill.id];g.human('restart',undefined,6000);assert.equal(g.room.round,2);assert.equal(g.room.dealer,0);assert.equal(g.room.completedRounds,1);
 for(let n=0;n<3;n++){if(g.room.replay)abandoned.add(g.room.replay.id);g.pause(6100+n);g.human('restart',undefined,7000+n);assert.equal(g.room.round,2);assert.equal(g.room.completedRounds,1);assert.equal(JSON.stringify(g.room.history[0]),saved);assert.deepEqual(g.room.players.map(p=>p.score),scores);assert.deepEqual(g.room.accountSavedRounds,[bill.id]);assert.equal(g.room.accountOwner,record?'owner':undefined);assert.equal(g.room.nextReplayEnabled,record)}
 const second=finish(g,8000);assert.equal(g.room.completedRounds,2);assert.equal(g.room.history.length,2);assert.equal(g.room.roundSummaries.length,2);assert.equal(second.round,2);for(const h of g.room.history)assert(!h.replay||!abandoned.has(h.replay.id));
 const restored=SoloGame.restore(g.serialize(9000),10000);assert(restored);assert.deepEqual(restored.room.players.map(p=>p.score),g.room.players.map(p=>p.score));assert.equal(restored.room.completedRounds,2);assert.equal(restored.room.history.length,2);
}
// All phases accept both speed settings, without resolving claims or playing a tile.
for(const phase of ['lobby','play','claim','done'])for(const paused of [false,true]){
 const g=fixture();if(phase!=='lobby')g.human('start',undefined,1100);if(phase==='done')finish(g,1200);
 if(phase==='play'){g.room.turn=1;g.room.deadline=1400}
 if(phase==='claim'){g.room.phase='claim';g.room.deadline=16000;g.room.claim={from:1,t:0,choices:{0:['peng'],2:['peng']},answers:{}}}
 if(paused&&['play','claim'].includes(phase))g.pause(1300);
 const hands=JSON.stringify(g.room.players),wall=JSON.stringify(g.room.wall),claim=JSON.stringify(g.room.claim),history=JSON.stringify(g.room.history),pause=g.pausedAt,deadline=g.room.deadline;
 for(const [fast,at] of [[1,2000],[0,2100]]){
  g.human('speed',fast,at);assert.equal(g.room.fast,!!fast);assert.equal(g.pausedAt,pause);assert.equal(g.room.phase,phase);assert.equal(JSON.stringify(g.room.players),hands);assert.equal(JSON.stringify(g.room.wall),wall);assert.equal(JSON.stringify(g.room.claim),claim);assert.equal(JSON.stringify(g.room.history),history);
  if(phase==='play')assert.equal(g.room.deadline,(pause??at)+(fast?500:2000));else assert.equal(g.room.deadline,deadline);
 }
 const before=JSON.stringify(g.room);assert.throws(()=>g.human('speed',2,2200),/请选择/);assert.equal(JSON.stringify(g.room),before);
 if(paused&&phase==='play'){g.human('speed',1,2300);g.resume(100000);assert.equal(g.snapshot(100000).remainingMs,500);assert.equal(g.tick(100499),false);assert.equal(g.tick(100500),true)}
}
// Real sidebar switches remain available while paused or responding.
function nodes(t){return Array.isArray(t)?t.flatMap(nodes):!t||typeof t!=='object'?[]:[t,...nodes(t.props?.children)]}
for(const phase of ['lobby','play','claim','done'])for(const paused of [false,true]){
 const calls=[],tree=ui.SoloPanel({room:{phase,paused,fast:false},onAction:(...v)=>calls.push(v),onRules(){}}),toggle=nodes(tree).find(n=>n.props?.['aria-label']==='单人快速模式');
 assert(toggle);assert(!toggle.props.disabled);toggle.props.onCheckedChange(true);toggle.props.onCheckedChange(false);assert.deepEqual(calls,[['speed',1],['speed',0]]);
}
console.log('PASS v37: restart from all phases/paused claims, no abandoned bills or replays, completed totals/history/owner preserved, fresh IDs and 108 tiles, all-phase speed toggles without moves/resume, 500ms after resume and actual sidebar controls.');
