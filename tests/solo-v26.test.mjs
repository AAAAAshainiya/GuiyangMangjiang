import assert from 'node:assert/strict';
import {act,advance,options} from '../lib/game.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const {SoloGame,SOLO_IDLE_MS}=await loadLocalLibrary('lib/solo.ts');
function humanTurn(fast=false){const g=new SoloGame('我','🐼',1000,fast);g.room.turn=0;g.room.phase='play';g.room.claim=null;g.room.deadline=46000;return g}
for(const fast of [false,true]){
 const g=humanTurn(fast),before=JSON.stringify(g.room.players[0]);
 assert.equal(g.tick(46000),false);assert.equal(g.room.players[0].managed,false);assert.equal(JSON.stringify(g.room.players[0]),before);
 assert.equal(g.tick(60999),false);assert.equal(g.tick(61000),true);assert.equal(g.pauseReason,'idle');assert.equal(g.snapshot(61000).options.length,0);
 assert.equal(JSON.stringify(g.room.players[0]),before);const frozen=g.serialize(61000);assert.equal(g.tick(1000000),false);assert.equal(g.serialize(61000),frozen);
 assert.throws(()=>g.human('discard',g.room.players[0].hand[0],70000),/暂停/);assert.equal(g.activity(70000),false);
 g.resume(100000);assert.equal(g.room.players[0].managed,false);assert.equal(g.snapshot(100000).idleRemainingMs,SOLO_IDLE_MS);
 g.human('discard',g.room.players[0].hand[0],100001);assert.equal(g.pausedAt,null);assert.equal(g.room.players[0].managed,false);assert.equal(g.room.players[0].autoMoves??0,0);
}
// Legal hu, an-kong and bu-kong are never selected by the timer.
for(const kind of ['hu','gang','bu']){
 const g=humanTurn();g.room.players[0].melds=[];
 if(kind==='hu')g.room.players[0].hand=[0,1,2,3,4,5,9,10,11,18,19,20,8,8];
 if(kind==='gang')g.room.players[0].hand=[3,3,3,3,0,1,2,9,10,11,18,19,20,8];
 if(kind==='bu'){g.room.players[0].hand=[3,0,1,2,9,10,11,18,19,20,8];g.room.players[0].melds=[{t:3,k:'peng',from:1}]}
 g.room.canKong=true;g.room.drawn=g.room.players[0].hand.at(-1);assert(options(g.room,0).some(o=>o===kind||o.startsWith(kind+':')));
 const before=JSON.stringify(g.room);g.tick(46000);assert.equal(JSON.stringify(g.room),before);g.tick(61000);assert.equal(g.room.phase,'play');assert.equal(g.room.result,null);
}
// The old 15-second claim deadline must not pass or choose for the human.
for(const choice of ['peng','gang','hu']){
 const g=humanTurn(true);g.room.phase='claim';g.room.deadline=16000;g.room.claim={from:1,t:0,rob:false,choices:{0:[choice],2:['peng']},answers:{}};
 g.tick(16000);assert.equal(g.room.claim.answers[0],undefined);assert.equal(g.room.claim.answers[2],'peng');assert.equal(g.room.phase,'claim');assert.equal(g.room.players[0].managed,false);
 assert.equal(g.activity(50000),true);g.tick(61000);assert.equal(g.pausedAt,null);assert.equal(g.room.claim.answers[0],undefined);
 g.tick(110000);assert.equal(g.pauseReason,'idle');assert.equal(g.room.claim.answers[0],undefined);
 const restored=SoloGame.restore(g.serialize(110000),200000);assert(restored);assert.equal(restored.pausedAt,200000);assert.equal(restored.room.claim.answers[0],undefined);assert.equal(restored.room.players[0].managed,false);
 restored.resume(250000);assert(restored.snapshot(250000).options.includes(choice));restored.human('pass',undefined,250001);assert.equal(restored.room.players[0].managed,false);
}
// Inactivity also freezes a due bot; manual pause preserves its remaining wait.
for(const fast of [false,true]){
 const g=humanTurn(fast);g.room.turn=1;g.room.deadline=61000;const before=JSON.stringify(g.room.players[1]);g.tick(61000);assert.equal(g.pauseReason,'idle');assert.equal(JSON.stringify(g.room.players[1]),before);
 g.resume(100000);g.room.deadline=100000+(fast?500:2000);g.pause(100100);const left=g.snapshot(100100).remainingMs;g.resume(200000);assert.equal(g.snapshot(200000).remainingMs,left);assert.equal(g.tick(200000+left-1),false);assert.equal(g.tick(200000+left),true);
}
// Old saved managed seats return paused and fully manual.
{const g=humanTurn();g.room.players[0].managed=true;const restored=SoloGame.restore(g.serialize(1000),100000);assert(restored);assert.equal(restored.room.players[0].managed,false);restored.resume(100001);assert(restored.snapshot(100001).options.includes('discard'));}
// The multiplayer default still times out into management and passes claims.
{const g=humanTurn();advance(g.room,46000);assert.equal(g.room.players[0].managed,true);assert.equal(g.room.players[0].autoMoves,1);}
{const g=humanTurn();g.room.phase='claim';g.room.deadline=16000;g.room.claim={from:1,t:0,choices:{0:['peng']},answers:{}};advance(g.room,16000);assert.equal(g.room.players[0].managed,true);}
console.log('PASS: normal/fast solo never discard/hu/kong/pass for the human, 60-second idle freeze, activity reset, explicit resume, bot waits, legacy managed restore and unchanged multiplayer timeouts.');
