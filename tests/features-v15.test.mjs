import assert from 'node:assert/strict';
import {create,player,start,act,advance,botDelay,view} from '../lib/game.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const {SoloGame}=await loadLocalLibrary('lib/solo.ts'),{TrainingGame}=await loadLocalLibrary('lib/training.ts');
function table(){const r=create('ABCD','0','我');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i,i!==0));r.players[0].ready=true;return r}
const original=crypto.getRandomValues;
function withDealer(seat,fn){crypto.getRandomValues=function(array){original.call(crypto,array);array[0]=array[0]-(array[0]%4)+seat;return array};try{return fn()}finally{crypto.getRandomValues=original}}
// Force each random outcome, rather than relying on chance to cover four seats.
for(let seat=0;seat<4;seat++)for(const fast of [false,true]){
 const r=table();r.fast=fast;withDealer(seat,()=>start(r,1000));assert.equal(r.dealer,seat);assert.equal(r.turn,seat);assert.equal(r.drawn,r.players[seat].hand[r.drawnIndex]);assert.equal(r.players[seat].hand.length,14);r.players.forEach((p,i)=>assert.equal(p.hand.length,i===seat?14:13));assert.equal(r.wall.length,55);assert.equal(r.deadline,1000+(seat===0?45000:fast?500:2000));assert.equal(view(r,'0').players.filter(p=>p.hand.length).length,1);
 r.players.forEach(p=>p.ready=true);const next=(seat+2)%4;r.dealer=next;r.phase='done';r.result=null;withDealer((next+1)%4,()=>start(r,10000));assert.equal(r.dealer,next,'later rounds never roll a new dealer');assert.equal(r.turn,next);
 const solo=withDealer(seat,()=>new SoloGame('我','🐼',1000));assert.equal(solo.room.dealer,seat);const lesson=withDealer(seat,()=>new TrainingGame());assert.equal(lesson.room.dealer,seat);
}
const winning=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
for(let winner=0;winner<4;winner++){
 const r=table();withDealer((winner+1)%4,()=>start(r,1000));r.turn=winner;r.phase='play';r.drawn=25;r.players[winner].hand=[...winning];act(r,winner,'hu',undefined,2000);assert.equal(r.dealer,winner);const points=r.players.map(p=>p.score);r.players.forEach(p=>p.ready=true);withDealer((winner+2)%4,()=>start(r,3000));assert.equal(r.turn,winner);assert.equal(r.players[winner].hand.length,14);assert.deepEqual(r.players.map(p=>p.score),points);
}
let r=table();r.fast=true;r.phase='play';r.turn=1;r.drawn=4;r.deadline=1500;r.players[1].hand=[4];r.wall=[9,10,11];const before=JSON.stringify(r);assert.equal(advance(r,1499),false);assert.equal(JSON.stringify(r),before);assert.equal(advance(r,1500),true);assert.equal(r.players[1].river.length,1);assert.equal(r.turn,2);assert.equal(r.deadline,2000);assert.equal(advance(r,1500),false,'no second instantaneous discard');assert.equal(advance(r,1999),false);assert.equal(advance(r,2000),true);assert.equal(r.turn,3);assert.equal(r.deadline,2500);
// Claiming and supplementing also give the fast bot a full 500 ms to discard.
for(const action of ['peng','gang']){r=table();r.fast=true;r.phase='play';r.turn=0;r.drawn=16;r.players[0].hand=[16];r.players[1].hand=action==='peng'?[16,16,4]:[16,16,16,4];r.wall=[9,10];act(r,0,'discard',16,1000);act(r,1,action,undefined,1100);assert.equal(r.deadline,1600);assert.equal(advance(r,1599),false);advance(r,1600);assert.equal(r.players[1].river.length,1)}
for(const kind of ['an','bu']){r=table();r.fast=true;r.phase='play';r.turn=1;r.drawn=3;r.canKong=true;r.players[1].hand=kind==='an'?[3,3,3,3,4]:[3,4];r.players[1].melds=kind==='bu'?[{t:3,k:'peng'}]:[];r.wall=[9,10];act(r,1,kind==='an'?'gang':'bu',3,1000);assert.equal(r.deadline,1500);assert.equal(advance(r,1499),false)}
r=table();r.fast=true;withDealer(0,()=>start(r,1000));assert.equal(r.deadline,46000);assert.equal(botDelay(r),500);assert.equal(advance(r,45999),false);r.fast=false;assert.equal(botDelay(r),2000);
const solo=withDealer(1,()=>new SoloGame('我','🐼',1000));solo.human('speed',1,1100);assert.equal(solo.room.deadline,1600);solo.pause(1200);assert.equal(solo.snapshot(99000).remainingMs,400);solo.resume(99000);assert.equal(solo.room.deadline,99400);assert.equal(solo.tick(99399),false);
// Drawn hands retain the established next-seat rule.
r=table();r.phase='play';r.turn=1;r.dealer=2;r.drawn=5;r.players[1].hand=[5];r.wall=[];act(r,1,'discard',5,1000);assert.equal(r.phase,'done');assert.equal(r.result.winner,-1);assert.equal(r.dealer,3);
console.log('PASS: all four first-dealer outcomes in online/solo/teaching, winner continues, drawn rotation, 500 ms fast discard/peng/kongs and pause, no same-timestamp bot chain, normal 2 s and human 45 s preserved.');
