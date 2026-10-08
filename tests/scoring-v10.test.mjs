import assert from 'node:assert/strict';
import {create,player,act,waits,start,huScore,view} from '../lib/game.ts';
const plain=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
const dui=[1,1,1,4,4,4,10,10,10,21,21,21,25,25];
const qi=[1,1,4,4,7,7,10,10,13,13,21,21,25,25];
const pure=[0,1,2,3,4,5,6,7,8,0,0,0,4,4];
const pureDui=[0,0,0,2,2,2,4,4,4,6,6,6,8,8];
const pureQi=[0,0,1,1,2,2,3,3,4,4,5,5,6,6];
const dragon=[1,1,1,1,4,4,10,10,13,13,21,21,25,25];
const pureDragon=[0,0,0,0,1,1,2,2,3,3,4,4,5,5];
const non=[1,3,5,7,8,10,12,14,15,17,19,21,23];
function table(){const r=create('ABCD','0','我');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=0;r.wall=[];r.drawn=25;r.heavenlyReady=[false,false,false,false];r.players.forEach(p=>p.hand=[...non]);r.players[0].hand=[...plain];return r}
function check(r){for(const key of ['hu','beans','chicken','delta'])assert.equal(r.result[key].reduce((a,b)=>a+b),0,key);for(let i=0;i<4;i++){assert.equal(r.result.delta[i],r.result.hu[i]+r.result.beans[i]+r.result.chicken[i]);const net=r.result.chickenTransfers.reduce((n,t)=>n+(t.to===i?t.points:0)-(t.from===i?t.points:0),0);assert.equal(net,r.result.chicken[i])}return r.result}
function settle(r){act(r,0,'hu',undefined,1000);return check(r)}
for(const [hand,base,flowerBase] of [[plain,4,8],[dui,8,16],[qi,12,20],[pure,16,24],[pureDui,24,32],[pureQi,28,36],[dragon,16,24],[pureDragon,32,40]])for(const flower of [false,true])for(const heaven of [false,true]){
 const r=table();r.players[0].hand=[...hand];r.drawn=hand.at(-1);r.afterKong=flower;r.heavenlyReady[0]=heaven;
 // With heaven alone, plain 4 is replaced by heaven 12; other specials add.
 const expected=heaven?(flower?flowerBase+12:base===4?12:base+12):(flower?flowerBase:base);
 const z=settle(r);assert.equal(z.huValues[0],expected);assert.deepEqual(z.hu,[expected*3,-expected,-expected,-expected]);assert.equal(z.huParts.reduce((n,p)=>n+p.points,0),expected);assert.equal(z.hotPenalty,0);
 if(hand===dragon||hand===pureDragon){assert.ok(z.huParts.some(p=>p.name==='龙七对'));assert.ok(!z.huParts.some(p=>p.name==='七对'))}
}
for(const pure of [false,true])for(const flower of [false,true]){
 const r=table();r.players[0].melds=(pure?[0,2,4,6]:[1,4,10,21]).map(t=>({t,k:'peng'}));r.players[0].hand=pure?[8,8]:[25,25];r.drawn=r.players[0].hand[0];r.afterKong=flower;
 const z=settle(r);assert.equal(z.huValues[0],12+(pure?16:0)+(flower?8:0));assert.ok(z.huParts.some(p=>p.name==='单吊'));assert.ok(!z.huParts.some(p=>p.name==='大对子'));
}
// Four identical tiles replace seven pairs once, even with multiple quads.
let r=table();r.players[0].hand=[1,1,1,1,10,10,10,10,21,21,21,21,25,25];assert.equal(huScore(r,0,'自摸').points,16);
// Same additive base for discard and self draw; only discarder pays on a claim.
r=table();r.players[0].hand=[25];r.players[1].hand=dui.slice(0,-1);act(r,0,'discard',25,1000);act(r,1,'hu',undefined,1100);assert.deepEqual(check(r).hu,[-8,8,0,0]);assert.equal(r.result.kind,'接炮');
// Heaven gives a plain shape permission to win from a discard.
r=table();r.players[0].hand=[25];r.players[1].hand=plain.slice(0,-1);r.heavenlyReady[1]=true;act(r,0,'discard',25,1000);assert.ok(r.claim.choices[1].includes('hu'));act(r,1,'hu',undefined,1100);assert.deepEqual(check(r).hu,[-12,12,0,0]);
// Non-ready discard penalties go only to eligible opponents, never each other.
r=table();r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:false}];r.players[2].river=[16];let z=settle(r);assert.deepEqual(z.values,[0,-4,-2,0]);assert.deepEqual(z.chicken,[6,-4,-2,0]);
r=table();r.players[1].hand=plain.slice(0,-1);r.players[1].river=[0];r.players[2].river=[16];z=settle(r);assert.deepEqual(z.values,[0,2,-2,0]);assert.deepEqual(z.chicken,[0,8,-6,-2]);
// Non-ready held/meld chickens and own beans vanish; qualified beans still paid.
r=table();r.players[1].hand[0]=0;r.players[1].melds=[{t:16,k:'gang',hidden:true}];r.players[1].hand=r.players[1].hand.slice(0,10);assert.equal(waits(r.players[1]).length,0);r.beanValues=[0,4,4,0];r.players[2].melds=[{t:7,k:'gang'}];r.players[2].hand=[1,2,3,10,11,12,21,22,23,25];r.beanTransfers=[{from:0,to:1,points:4},{from:2,to:1,points:4},{from:3,to:1,points:4},{from:0,to:2,points:4},{from:1,to:2,points:4},{from:3,to:2,points:4}];z=settle(r);assert.equal(z.values[1],0);assert.deepEqual(z.beanValues,[0,0,4,0]);assert.deepEqual(z.beans,[-4,-4,12,-4]);
// Actual concealed kong, replacement draw, then hot discard: burn even a listener.
r=table();r.wall=[25];r.canKong=true;r.players[0].hand=[1,1,1,1,4,5,6,10,11,12,21,22,23,25];r.players[0].river=[0];r.charges=[{tile:0,player:0,index:0,claimed:false}];r.players[1].hand=dui.slice(0,-1);r.players[2].melds=[{t:7,k:'gang'}];r.players[2].hand=[1,2,3,10,11,12,21,22,23,25];r.players[2].river=[16];r.beanValues=[0,0,4,0];r.beanTransfers=[{from:0,to:2,points:4},{from:1,to:2,points:4},{from:3,to:2,points:4}];
act(r,0,'gang',1,1000);assert.equal(r.afterKong,true);act(r,0,'discard',25,1100);assert.equal(r.afterKong,false);assert.equal(r.claim.hot,true);act(r,2,'pass',undefined,1150);act(r,1,'hu',undefined,1200);z=check(r);assert.equal(z.kind,'热炮');assert.equal(z.huValues[1],8);assert.equal(z.huPayable,12);assert.deepEqual(z.hu,[-12,12,0,0]);assert.deepEqual(z.burned,[true,false,false,false]);assert.equal(z.revealed[0],true);assert.equal(z.eligible[0],false);assert.equal(z.values[0],0);assert.deepEqual(z.chickenDetails[0],[]);assert.deepEqual(z.beanValues,[0,0,4,0]);assert.deepEqual(z.beans,[-4,-4,12,-4]);assert.deepEqual(z.chicken,[-2,-2,6,-2]);assert.deepEqual(z.delta,[-18,6,18,-6]);
const visible=view(r,'0');assert.equal(visible.result.chickenDetails,undefined);assert.deepEqual(visible.result.myChickenDetails,[]);assert.equal(visible.players[2].melds[0].t,7);
// Heat expires after its discard is passed; the next player does not inherit it.
r=table();r.afterKong=true;r.wall=[2,3];r.players[0].hand=[24];act(r,0,'discard',24,1000);assert.equal(r.turn,1);assert.equal(r.afterKong,false);r.players[1].hand=[25];r.players[2].hand=dui.slice(0,-1);act(r,1,'discard',25,1100);assert.equal(r.claim.hot,false);act(r,2,'hu',undefined,1200);assert.equal(check(r).kind,'接炮');assert.equal(r.result.hotPenalty,0);
// Robbing an added kong uses normal new additive score, cancels that bean, no burn.
r=table();r.canKong=true;r.wall=[5];r.players[0].melds=[{t:25,k:'peng'}];r.players[0].hand=[25,1,2,3,10,11,12,21,22,23,6];r.players[1].hand=dui.slice(0,-1);act(r,0,'bu',25,1000);act(r,1,'hu',undefined,1100);z=check(r);assert.equal(z.kind,'抢杠胡');assert.deepEqual(z.hu,[-8,8,0,0]);assert.equal(z.hotPenalty,0);assert.deepEqual(z.beanValues,[0,0,0,0]);assert.ok(z.burned.every(v=>!v));
// Flow cancels every channel and all transfer ledgers.
r=table();r.players[0].hand=[24];r.beanTransfers=[{from:1,to:0,points:4}];r.beans=[4,-4,0,0];r.beanValues=[4,0,0,0];act(r,0,'discard',24,1000);z=check(r);for(const key of ['hu','beans','chicken','delta','values','beanValues'])assert.deepEqual(z[key],[0,0,0,0]);assert.deepEqual(z.chickenTransfers,[]);assert.deepEqual(z.beanTransfers,[]);
// Initial 13 qualification, before dealer extra draw. Deterministic shuffle remains private.
r=table();r.players.forEach(p=>p.ready=true);const oldRandom=crypto.getRandomValues;let counter=107;crypto.getRandomValues=function(a){a[0]=counter--;return a};try{start(r,2000)}finally{crypto.getRandomValues=oldRandom}
assert.equal(r.scoringVersion,3);for(let i=0;i<4;i++){const p=structuredClone(r.players[i]);if(i===r.dealer)p.hand.splice(r.drawnIndex,1);assert.equal(r.heavenlyReady[i],waits(p).length>0)}assert.equal(view(r,'0').heavenlyReady,undefined);
// Old active round still has v2 multipliers, switches only on next start.
r=table();r.scoringVersion=2;r.afterKong=true;act(r,0,'hu',undefined,1000);assert.deepEqual(r.result.hu,[18,-6,-6,-6]);assert.equal(r.result.huParts,undefined);r.players.forEach(p=>p.ready=true);start(r,2000);assert.equal(r.scoringVersion,3);
console.log('PASS: v10 additive patterns, dragon/heaven/single, payer responsibility, hot discard lifecycle and burn, qualified chicken/bean payments, private views, drawn rounds, initial deal and old-round migration.');
