import assert from 'node:assert/strict';
import {create,player,act,waits,start,view} from '../lib/game.ts';
const winning=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
const readyKong=[1,2,3,10,11,12,21,22,23,25];
const unreadyKong=[1,3,5,10,12,14,19,21,23,25];
function table(){const r=create('ABCDEFGH','0','我');r.scoringVersion=2;r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=0;r.drawn=25;r.wall=[];r.players[0].hand=[...winning];return r}
function pay(r,from,to){r.beanTransfers.push({from,to,points:4});r.beans[from]-=4;r.beans[to]+=4}
function kong(r,i,ready,kind,from=2){r.players[i].melds=[{t:7+i,k:'gang',hidden:kind==='an'}];r.players[i].hand=[...(ready?readyKong:unreadyKong)];r.beanValues[i]=4;assert.equal(waits(r.players[i]).length>0,ready);if(kind==='ming')pay(r,from,i);else for(let j=0;j<4;j++)if(j!==i)pay(r,j,i)}
function settle(r){act(r,0,'hu',undefined,1000);assert.equal(r.result.beanRequiresReady,true);for(const key of ['hu','beans','chicken','delta'])assert.equal(r.result[key].reduce((a,b)=>a+b),0,key+' stays zero-sum');return r.result}
// Receipt eligibility is independent of the payer's ready status for all kong kinds.
for(const kind of ['ming','an','bu'])for(const eligible of [false,true])for(const payerReady of [false,true]){
 const r=table();kong(r,1,eligible,kind);if(payerReady)r.players[2].hand=winning.slice(0,-1);
 const result=settle(r),expected=[0,0,0,0];if(eligible){const payers=kind==='ming'?[2]:[0,2,3];for(const j of payers){expected[j]-=4;expected[1]+=4}}
 assert.deepEqual(result.beans,expected);assert.equal(result.beanValues[1],eligible?4:0);
 assert.equal(result.beanTransfers.length,eligible?(kind==='ming'?1:3):0);
 assert.deepEqual(view(r,'1').result.beans,expected,'API and stored settlement agree');
}
// A non-ready player loses their own receipts but still owes the ready player.
let r=table();kong(r,1,true,'an');kong(r,2,false,'ming',0);kong(r,3,false,'bu');
let result=settle(r);assert.deepEqual(result.beanValues,[0,4,0,0]);assert.deepEqual(result.beans,[-4,12,-4,-4]);
assert(result.beanTransfers.every(t=>t.to===1));assert.equal(result.delta[2],result.hu[2]+result.chicken[2]-4);
// A winner is eligible even though a completed 14-tile shape has no waits.
r=table();r.players[0].melds=[{t:7,k:'gang',hidden:true}];r.players[0].hand=[...readyKong,25];r.beanValues[0]=4;for(let j=1;j<4;j++)pay(r,j,0);
assert.equal(waits(r.players[0]).length,0);result=settle(r);assert.equal(result.beanValues[0],4);assert.deepEqual(result.beans,[12,-4,-4,-4]);
// Flow cancellation wins over the ready rule, including previously recorded receipts.
r=table();kong(r,1,true,'an');r.players[0].hand=[...winning.slice(0,-1),26];act(r,0,'discard',26,1000);
assert.equal(r.result.winner,-1);assert.deepEqual(r.result.beans,[0,0,0,0]);assert.deepEqual(r.result.beanValues,[0,0,0,0]);assert.deepEqual(r.result.beanTransfers,[]);assert.deepEqual(r.result.delta,[0,0,0,0]);
// Already-started old rounds keep their original payments; next start adopts the rule.
r=table();delete r.beanRequiresReady;kong(r,1,false,'an');act(r,0,'hu',undefined,1000);
assert.deepEqual(r.result.beans,[-4,12,-4,-4]);assert.equal(r.result.beanValues[1],4);assert.equal(r.result.beanRequiresReady,false);
const totals=r.players.map(p=>p.score);r.players.forEach(p=>p.ready=true);start(r,2000);
assert.equal(r.beanRequiresReady,true);assert.deepEqual(r.beanTransfers,[]);assert.deepEqual(r.beans,[0,0,0,0]);assert.deepEqual(r.players.map(p=>p.score),totals);
console.log('PASS: all kong kinds, ready/unready recipients and payers, mixed receipts/cancellations, winner eligibility, zero-sum totals, flow cancellation and next-round compatibility.');
