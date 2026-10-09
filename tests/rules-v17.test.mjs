import assert from 'node:assert/strict';
import {create,player,start,act,view,waits,huScore,setRoomRules,defaultRules,validateRules,isChicken} from '../lib/game.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const {SoloGame}=await loadLocalLibrary('lib/solo.ts'),{TrainingGame}=await loadLocalLibrary('lib/training.ts');
const plain=[1,2,3,4,5,6,10,11,12,21,21,21,25,25],dui=[1,1,1,4,4,4,10,10,10,21,21,21,25,25],non=[1,3,5,7,8,10,12,14,15,17,19,21,23],readyKong=[1,2,3,10,11,12,21,22,23,25];
function table(rules=defaultRules()){const r=create('ABCD','0','玩家0');r.players=[0,1,2,3].map(i=>({...player(String(i),'玩家'+i),ready:true}));setRoomRules(r,0,rules);start(r,1000);r.turn=0;r.phase='play';r.heavenlyReady=[false,false,false,false];r.drawn=25;r.wall=[];r.players.forEach(p=>{p.hand=[...non];p.river=[];p.melds=[]});r.players[0].hand=[...plain];return r}
function win(r){r.phase='play';r.turn=0;r.drawn=25;act(r,0,'hu',undefined,2000);for(let i=0;i<4;i++)assert.equal(r.result.chickenAudit[i].reduce((n,d)=>n+d.actual,0),r.result.values[i]);assert.equal(r.result.delta.reduce((a,b)=>a+b),0);return r}
let r=table();r.wall=[0];r.players[1].river=[1];win(r);assert.equal(r.result.rooster,1);assert.equal(r.result.values[1],0);assert.equal(r.result.chickenAudit[1].find(d=>d.source==='river').status,'flipExempt');assert.equal(r.result.chickenDetails[1].length,0);
let base=table();base.wall=[0];win(base);assert.equal(r.result.delta[1],base.result.delta[1],'unready pure flip adds no penalty');
r=table();r.wall=[0];r.players[1].hand=dui.slice(0,-1);r.players[1].river=[1];win(r);assert(r.result.eligible[1]);assert.equal(r.result.chickenDetails[1].find(d=>d.source==='river').points,1);
for(const tile of [0,18,16])for(const charge of [false,true]){r=table();r.wall=[Math.floor(tile/9)*9+(tile%9+8)%9];r.players[1].river=[tile];if(charge)r.charges=[{tile,player:1,index:0,claimed:false}];win(r);assert.equal(r.result.rooster,tile);assert.equal(r.result.values[1],charge?-5:-3)}
const custom=defaultRules();custom.chickenTiles=[5];custom.chicken=7;custom.charge=11;custom.flip=2;custom.ming=6;custom.an=8;custom.bu=9;custom.hot=5;custom.hu={ping:3,peng:9,kong:10,pure:20,seven:14,dragon:18,heaven:15,single:17};
r=table(custom);r.wall=[8];r.players[1].river=[0];win(r);assert.equal(r.result.values[1],0,'removed fixed chicken is now only a pure flip');
for(const charge of [false,true]){r=table(custom);r.wall=[4];r.players[1].river=[5];if(charge)r.charges=[{tile:5,player:1,index:0,claimed:false}];win(r);assert.equal(r.result.values[1],charge?-13:-9)}
r=table(custom);r.players[0].hand=[0];r.wall=[26];act(r,0,'discard',0,1100);assert.equal(r.charges.length,0);r.phase='play';r.turn=0;r.players[0].hand=[5];act(r,0,'discard',5,1200);assert.equal(r.charges[0].tile,5);
assert.equal(isChicken(0,custom),false);assert.equal(isChicken(5,custom),true);
r=table(custom);assert.equal(huScore(r,0,'自摸').points,3);r.players[0].hand=dui;assert.equal(huScore(r,0,'自摸').points,9);assert.equal(huScore(r,0,'杠上开花').points,19);
r.players[0].hand=[0,0,2,2,4,4,10,10,12,12,18,18,22,22];assert.equal(huScore(r,0,'自摸').points,14);r.players[0].hand=[0,0,0,0,4,4,10,10,12,12,18,18,22,22];assert.equal(huScore(r,0,'自摸').points,18);r.heavenlyReady[0]=true;assert.equal(huScore(r,0,'自摸').points,33);
r=table(custom);r.players[0].melds=[0,3,6,7].map(t=>({t,k:'peng'}));r.players[0].hand=[8,8];assert.equal(huScore(r,0,'自摸').points,37,'single replaces peng but still adds pure');
for(const type of ['ming','an','bu']){r=table(custom);r.wall=[26,25];r.canKong=true;r.players[1].hand=[...readyKong];r.turn=1;
 if(type==='an'){r.players[1].hand.push(7,7,7,7);act(r,1,'gang',7,1100)}
 else if(type==='bu'){r.players[1].melds=[{t:7,k:'peng'}];r.players[1].hand.push(7);act(r,1,'bu',7,1100);if(r.phase==='claim')for(const k of Object.keys(r.claim.choices))act(r,Number(k),'pass',1150)}
 else{r.turn=3;r.players[3].hand=[7];r.players[1].hand.push(7,7,7);act(r,3,'discard',7,1100);for(const k of Object.keys(r.claim.choices))act(r,Number(k),Number(k)===1?'gang':'pass',1150)}
 assert.equal(r.beanEvents[0].unit,custom[type]);assert.equal(r.beanValues[1],custom[type]);r.players[1].hand=[...readyKong];assert(waits(r.players[1]).length);win(r);assert.equal(r.result.beans[1],custom[type]*(type==='ming'?1:3));assert.equal(r.result.beanAudit[0].unit,custom[type]);
}
r=table(custom);r.canKong=true;r.wall=[25];r.players[0].hand=[0,0,0,0,...readyKong];r.players[1].hand=dui.slice(0,-1);act(r,0,'gang',0,1100);act(r,0,'discard',25,1200);for(const k of Object.keys(r.claim.choices))act(r,Number(k),Number(k)===1?'hu':'pass',1300);assert.equal(r.result.hotPenalty,5);assert.equal(r.result.huPayable,14);assert.equal(r.result.hu[0],-14);assert(r.result.burned[0]);assert.equal(r.result.values[0],0);assert.match(r.logs[0],/额外 5 分/);
// Each round's settings and bill remain independent of later table edits.
r=table();win(r);const historical=JSON.stringify(r.result),delta=[...r.result.delta],score=r.players.map(p=>p.score);setRoomRules(r,0,custom);assert.equal(JSON.stringify(r.result),historical);assert.deepEqual(r.history[0].result.delta,delta);assert.deepEqual(r.history[0].result.rules,defaultRules());assert.deepEqual(view(r,'0').result.rules,defaultRules());r.players.forEach(p=>p.ready=true);start(r,3000);assert.deepEqual(r.roundRules,custom);assert.deepEqual(r.players.map(p=>p.score),score);assert.deepEqual(view(r,'0').history[0].bill.result.rules,defaultRules());assert.throws(()=>setRoomRules(r,0,defaultRules()),/本局结束/);
// Already running old rooms retain both old numbers and flip penalty behavior.
r=table();delete r.roundRules;delete r.flipPenaltyOnlyFixed;r.rules=custom;r.wall=[0];r.players[1].river=[1];win(r);assert.equal(r.result.values[1],-1);assert.equal(r.result.huValues[0],4);assert.equal(r.result.flipPenaltyOnlyFixed,false);r.players.forEach(p=>p.ready=true);start(r,3000);assert.equal(r.flipPenaltyOnlyFixed,true);assert.deepEqual(r.roundRules,custom);
r=create('ABCD','0','甲');r.players.push(player('1','乙'));assert.throws(()=>setRoomRules(r,1,custom),/只有房主/);
for(const bad of [-1,1.5,NaN,Infinity,1001,'4'])assert.throws(()=>validateRules({...custom,flip:bad}),/整数/);
for(const tiles of [[27],[-1],[1,1],[1.5],['0']])assert.throws(()=>validateRules({...custom,chickenTiles:tiles}),/固定鸡牌/);
assert.deepEqual(validateRules({...custom,chickenTiles:[]}).chickenTiles,[]);assert.equal(validateRules({...custom,chicken:0}).chicken,0);
for(const C of [SoloGame,TrainingGame]){const game=new C();assert.throws(()=>setRoomRules(game.room,0,custom),/本局结束/);game.room.phase='done';game.human('rules',undefined,...(C===SoloGame?[2000,custom]:[custom]));assert.deepEqual(game.room.rules,custom);const restored=C.restore(game.serialize());assert(restored);assert.deepEqual(restored.room.rules,custom);if(C===TrainingGame)game.settlementStep=4;game.human('ready');assert.deepEqual(game.room.roundRules,custom)}
console.log('PASS: new pure-flip exemption and overlap 3/5, dynamic fixed tiles and all point categories, configured kongs/hot burn, immutable per-round/history rules, old-round migration, validation, host permission and local restore.');
