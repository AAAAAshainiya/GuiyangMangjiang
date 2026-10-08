import assert from 'node:assert/strict';
import {pattern,create,player,start,tick,view,act,options,waits} from '../lib/game.ts';
const m=(t,k='peng')=>({t,k});
assert.equal(pattern([0,1,2,3,4,5,9,10,11,24,24,24,17,17]).name,'平胡');
assert.equal(pattern([0,0,2,2,4,4,9,9,11,11,18,18,22,22]).name,'七对');
assert.equal(pattern([0,0,0,3,3,3,9,9,9,18,18,18,22,22]).name,'大对子');
assert.equal(pattern([0,1,2,3,4,5,6,7,8,0,0,0,4,4]).name,'清一色·平胡');
assert.equal(pattern([0,1,2,3,4,5,6,7,8,9,10,11,18,25]),null);
let wins=0,draws=0,kongs=0;
for(let n=0;n<60;n++){
 const r=create('ABCDEFGH','a','A');r.players=[0,1,2,3].map(i=>player(String(i),'电脑'+i,true));start(r,1000);
 for(let i=0;i<450&&r.phase!=='done';i++){
   const all=[...r.wall,...r.players.flatMap(p=>[...p.hand,...p.river,...p.melds.flatMap(m=>Array(m.k==='gang'?4:3).fill(m.t))])];
   assert.equal(all.length,108,'all physical tiles conserved');for(let t=0;t<27;t++)assert.equal(all.filter(x=>x===t).length,4,'exactly four copies');
   const v=view(r,'0');assert.equal(v.players[1].hand.length,0);assert.equal('wall' in v,false);assert.equal('id' in v.players[1],false);
   tick(r,r.deadline+1);
 }
 assert.equal(r.phase,'done','game must end');assert.equal(r.result.delta.reduce((a,b)=>a+b),0);if(r.result.winner<0)draws++;else wins++;kongs+=r.players.flatMap(p=>p.melds).filter(m=>m.k==='gang').length;
}
const r=create('ABCDEFGH','0','A');r.players=[0,1,2,3].map(i=>player(String(i),'P'+i));r.phase='play';r.turn=0;r.wall=[5,6,7];r.canKong=true;
r.players[0].hand=[0,1,2,3,4,5,9,10,11,6,6];r.players[0].melds=[m(6)];
r.players[1].hand=[0,1,2,3,4,5,9,10,11,18,18,18,6];
act(r,0,'bu',6,100);assert.equal(r.phase,'claim');assert.ok(options(r,1).includes('hu'));act(r,1,'hu',undefined,101);assert.equal(r.result.kind,'抢杠胡');assert.equal(r.players[0].melds[0].k,'peng');assert.equal(r.beans.reduce((a,b)=>a+b),0);
const p=player('p','P');p.hand=[0,1,2,3,4,5,9,10,11,18,18,18,6];assert.ok(waits(p).includes(6));
const s=create('ABCDEFGH','0','A');s.players=[0,1,2,3].map(i=>player(String(i),'P'+i));s.phase='play';s.turn=0;s.wall=[5,6,7];s.players[0].hand=[6];s.players[1].hand=[6,6,2,3,4,9,10,11,12,13,14,15,15];s.players[2].hand=[0,0,0,3,3,3,9,9,9,18,18,18,6];
act(s,0,'discard',6,100);act(s,1,'peng',undefined,101);assert.equal(s.phase,'claim');act(s,2,'hu',undefined,102);assert.equal(s.result.winner,2,'hu outranks peng');
assert.throws(()=>act(s,1,'discard',6,103));
console.log(JSON.stringify({passed:true,simulatedGames:60,wins,draws,kongs,checks:'tile conservation, hidden hands, zero-sum settlement, claim priority, robbing added kong, invalid actions'}));
