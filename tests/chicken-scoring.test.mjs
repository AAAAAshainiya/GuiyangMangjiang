import assert from 'node:assert/strict';
import {create,player,act,waits,pattern} from '../lib/game.ts';

const winning=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
const waiting=winning.slice(0,-1);
const notWaiting=[1,3,5,7,8,10,12,14,15,17,19,21,23];
function table(){
 const r=create('ABCDEFGH','0','玩家0');
 r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));
 r.phase='play';r.wall=[];r.turn=0;
 r.players.forEach(p=>p.hand=[...notWaiting]);
 r.players[0].hand=[...winning];
 assert.ok(pattern(r.players[0].hand));
 assert.equal(waits(r.players[1]).length,0);
 return r;
}
function settle(r){
 act(r,0,'hu',undefined,1000);
 for(const field of ['hu','beans','chicken','delta'])assert.equal(r.result[field].reduce((a,b)=>a+b,0),0,field+' conserves points');
 return r.result;
}
function discardCase(ready,charge,t=0,flip=null){
 const r=table();if(ready)r.players[1].hand=[...waiting];
 r.players[1].river=[t];if(charge)r.charges=[{tile:t,player:1,index:0,claimed:false}];
 if(flip!==null)r.wall=[flip];return settle(r);
}
for(const t of [0,18,16]){
 let result=discardCase(true,true,t);
 assert.equal(result.values[1],4);assert.deepEqual(result.chicken,[-4,12,-4,-4],'ready charge collects four from each opponent');
 result=discardCase(false,true,t);
 assert.equal(result.values[1],-4);assert.deepEqual(result.chicken,[4,-12,4,4],'non-ready charge pays four to each opponent');
 result=discardCase(true,false,t);
 assert.equal(result.values[1],2);assert.deepEqual(result.chicken,[-2,6,-2,-2]);
 result=discardCase(false,false,t);
 assert.equal(result.values[1],-2);assert.deepEqual(result.chicken,[2,-6,2,2]);
}
let r=table();r.players[1].hand[0]=0;assert.equal(waits(r.players[1]).length,0);
assert.equal(settle(r).values[1],0,'a non-ready held chicken carries no penalty');
r=table();r.players[1].melds=[{t:16,k:'gang',hidden:true}];r.players[1].hand=notWaiting.slice(0,10);
assert.equal(waits(r.players[1]).length,0);assert.equal(settle(r).values[1],0,'non-ready concealed kong chickens carry no penalty');
r=table();r.players[1].melds=[{t:16,k:'gang',hidden:true}];r.players[1].hand=[1,2,3,10,11,12,21,22,23,25];
assert.ok(waits(r.players[1]).length);assert.equal(settle(r).values[1],8,'ready concealed kong counts four chickens');
assert.equal(discardCase(true,false,0,8).values[1],3,'fixed and flipped chicken stack');
assert.equal(discardCase(true,true,0,8).values[1],5,'charge and flipped chicken stack');
assert.equal(discardCase(false,true,0,8).values[1],-5,'stacked charge penalty');
assert.equal(discardCase(true,false,24,23).values[1],1,'flipped-only chicken receives one point');
assert.equal(discardCase(false,false,24,23).values[1],-1,'discarded flipped-only chicken pays one point if not ready');
r=table();r.players[1].hand=[...waiting];r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:false}];r.players[2].river=[16];
assert.deepEqual(settle(r).chicken,[-2,14,-10,-2],'positive receipts and negative penalties offset independently');
// A claimed charge disappears from its original owner's score and does not restart.
r=table();r.wall=[7];r.players[0].hand=[0,0];r.players[1].hand=[0,0,1,2,3,10,11,12,21,22,23,25];
act(r,0,'discard',0,1000);act(r,1,'peng',undefined,1100);
assert.equal(r.charges[0].claimed,true);assert.deepEqual(r.players[0].river,[]);
r.players[0].hand=[...winning];r.players[1].hand=[1,2,3,10,11,12,21,22,23,25];r.turn=0;r.phase='play';r.wall=[];
let result=settle(r);assert.equal(result.values[0],0);assert.equal(result.values[1],6,'recipient peng counts ordinary two-point chickens');
r=table();r.players[1].hand=[...waiting];r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:true}];
assert.equal(settle(r).values[1],2,'a later discard at a reused river index is not another charge');
// Exhausting the wall cancels hu, chicken and all previously accumulated bean points.
r=table();r.beans=[6,-2,-2,-2];r.players.forEach((p,i)=>p.score=10+i);r.players[0].hand=[...waiting,20];r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:false}];
act(r,0,'discard',20,1000);
assert.equal(r.phase,'done');assert.equal(r.result.winner,-1);
for(const field of ['hu','beans','chicken','delta','values'])assert.deepEqual(r.result[field],[0,0,0,0]);
assert.deepEqual(r.players.map(p=>p.score),[10,11,12,13]);assert.equal(r.result.flip,null);
console.log('PASS: all three fixed chickens; ready receipts, non-ready discard penalties, no held penalty, concealed kong, flip stacking, offsets, claimed charges and zero-point drawn rounds.');
