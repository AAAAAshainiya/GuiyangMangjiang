import assert from 'node:assert/strict';
import {create,player,act,start} from '../lib/game.ts';
const cases=[
 [[1,2,3,4,5,6,10,11,12,21,21,21,25,25],3],
 [[1,1,1,4,4,4,10,10,10,21,21,21,25,25],6],
 [[1,1,4,4,7,7,10,10,13,13,21,21,25,25],12],
 [[0,1,2,3,4,5,6,7,8,0,0,0,4,4],12],
 [[0,0,0,2,2,2,4,4,4,6,6,6,8,8],24],
 [[0,0,1,1,2,2,3,3,4,4,5,5,6,6],48],
];
function table(){const r=create('ABCDEFGH','0','我');r.scoringVersion=2;r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=0;r.wall=[];r.drawn=25;return r}
for(const [hand,n] of cases)for(const flower of [false,true]){
 const r=table();r.players[0].hand=[...hand];r.drawn=hand.at(-1);r.afterKong=flower;act(r,0,'hu',undefined,1000);
 const value=n*(flower?2:1);assert.deepEqual(r.result.hu,[value*3,-value,-value,-value]);assert.deepEqual(r.result.huValues,[value,0,0,0]);assert.equal(r.result.delta.reduce((a,b)=>a+b),0);
}
let r=table();r.wall=[5];r.canKong=true;r.players[0].hand=[1,1,1,1,4,5,6,10,11,12,21,22,23,25];act(r,0,'gang',1,1000);assert.deepEqual(r.beans,[12,-4,-4,-4]);assert.deepEqual(r.beanValues,[4,0,0,0]);
r=table();r.wall=[5];r.canKong=true;r.players[0].melds=[{t:1,k:'peng'}];r.players[0].hand=[1,4,5,6,10,11,12,21,22,23,25];act(r,0,'bu',1,1000);assert.deepEqual(r.beans,[12,-4,-4,-4]);assert.deepEqual(r.beanValues,[4,0,0,0]);
r=table();r.wall=[5];r.players[0].hand=[1];r.players[1].hand=[1,1,1,4,5,6,10,11,12,21,22,23,25];act(r,0,'discard',1,1000);act(r,1,'gang',undefined,1100);assert.deepEqual(r.beans,[-4,4,0,0]);assert.deepEqual(r.beanValues,[0,4,0,0]);
// Old ongoing rounds finish under their original rules; next start switches rules.
r=table();delete r.scoringVersion;delete r.beanValues;r.players[0].hand=cases[0][0];act(r,0,'hu',undefined,1000);assert.deepEqual(r.result.hu,[3,-1,-1,-1]);assert.equal(r.result.scoringVersion,1);r.players.forEach(p=>p.ready=true);start(r,2000);assert.equal(r.scoringVersion,3);assert.deepEqual(r.beanValues,[0,0,0,0]);
r=table();r.wall=[5];r.canKong=true;r.players[0].melds=[{t:6,k:'peng'}];r.players[0].hand=[6,1,2,3,10,11,12,21,22,23,25];r.players[1].hand=[0,1,2,3,4,5,9,10,11,18,18,18,6];act(r,0,'bu',6,1000);act(r,1,'hu',undefined,1100);assert.deepEqual(r.beanValues,[0,0,0,0]);assert.equal(r.result.huValues[1],2,'robbing kong retains its original base multiplier');
console.log('PASS: all self-draw patterns and kong flowers, four-point kong payments, personal scoring fields, robbed kong and old-round compatibility.');
