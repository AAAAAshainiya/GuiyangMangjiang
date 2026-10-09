import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const tableEvents=await loadLocalLibrary('lib/table-events.ts');
import * as interaction from '../lib/interaction.ts';
import * as client from '../lib/table-client.ts';
const {create,player,act,view,waits,start}=game;
const plain=[1,2,3,4,5,6,10,11,12,21,21,21,25,25],dui=[1,1,1,4,4,4,10,10,10,21,21,21,25,25],non=[1,3,5,7,8,10,12,14,15,17,19,21,23],readyKong=[1,2,3,10,11,12,21,22,23,25],unreadyKong=[0,3,5,10,12,14,19,21,23,25];
function table(){const r=create('ABCD','0','玩家0');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=0;r.drawn=25;r.wall=[];r.players.forEach(p=>p.hand=[...non]);r.players[0].hand=[...plain];return r}
function win(r){r.turn=0;r.phase='play';r.drawn=25;act(r,0,'hu',undefined,2000);return r}
function assertLedgers(r){for(let i=0;i<4;i++){assert.equal(r.result.chickenAudit[i].reduce((n,d)=>n+d.actual,0),r.result.values[i]);const net=r.result.beanAudit.reduce((n,e)=>n+(e.status!=='counted'?0:e.seat===i?e.unit*e.payers.length:e.payers.includes(i)?-e.unit:0),0);assert.equal(net,r.result.beans[i]);}assert.equal(r.result.delta.reduce((a,b)=>a+b),0)}
function mod(object){return new vm.SyntheticModule(Object.keys(object),function(){for(const k of Object.keys(object))this.setExport(k,object[k])})}
const imports={'react':mod(React),'react/jsx-runtime':mod(jsx),'lucide-react':mod(icons),'@/lib/table-events':mod(tableEvents),'@/lib/game':mod(game),'@/lib/interaction':mod(interaction),'@/lib/table-client':mod(client)};
const source=ts.transpileModule(fs.readFileSync('app/game-social.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const module=new vm.SourceTextModule(source);await module.link(s=>imports[s]);await module.evaluate();const {SettlementDetails,ScoreOverview,RoundEnd}=module.namespace;
const render=(r,id='0')=>renderToStaticMarkup(React.createElement(SettlementDetails,{room:view(r,id),defaultOpen:true}));
// Actual concealed kong and discard: event survives even if its receipts cancel.
for(const ready of [false,true]){
 let r=table();r.turn=1;r.canKong=true;r.wall=[26,5];r.players[1].hand=[16,16,16,16,...(ready?readyKong:unreadyKong)];r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:false}];act(r,1,'gang',16,1000);act(r,1,'discard',5,1100);assert.equal(waits(r.players[1]).length>0,ready);win(r);assertLedgers(r);
 assert.equal(r.result.beanAudit[0].type,'an');assert.equal(r.result.beanAudit[0].status,ready?'counted':'notReady');assert.equal(r.result.beanAuditComplete,true);const mine=view(r,'1'),other=view(r,'0');assert.equal(mine.result.beanAudit[0].tile,16);assert.equal(other.result.beanAudit[0].tile,16);assert.equal(other.players[1].melds[0].t,16);assert.equal(other.players[1].melds[0].faceUp,true);assert.equal(other.result.chickenAudit,undefined);assert.equal(other.result.chickenDetails,undefined);assert.equal(other.result.myChickenAudit.some(d=>d.source==='an'),false);
 let html=render(r,'1');assert.match(html,/16.webp/);assert.match(html,/暗杠/);assert.match(html,/自己的鸡分：/);assert.match(html,/计算过程/);assert.match(html,/鸡分抵扣：收到/);assert.match(html,/open=""/);
 if(!ready){assert.match(html,/杠牌者最终未听牌：这次豆全部取消/);assert.match(html,/持有鸡不收分，也不罚分/);assert.equal(r.result.chickenAudit[1].find(d=>d.source==='an').actual,0);assert.equal(r.result.chickenAudit[1].find(d=>d.source==='river').actual,-4)}
 html=render(r,'0');assert.match(html,/16.webp/);assert.doesNotMatch(html,/暗杠牌背/);
}
// Ming kong has exactly one payer, visible face, and a four-point own base.
let r=table();r.turn=3;r.wall=[26,5];r.players[3].hand=[16];r.players[1].hand=[16,16,16,...readyKong];act(r,3,'discard',16,1000);act(r,1,'gang',undefined,1100);act(r,1,'discard',5,1200);win(r);assertLedgers(r);assert.deepEqual(r.result.beanAudit[0].payers,[3]);assert.equal(r.result.beanValues[1],4);assert.deepEqual(r.result.beans,[0,4,0,-4]);assert.equal(view(r,'0').result.beanAudit[0].tile,16);let html=render(r,'3');assert.match(html,/原定由你各给玩家1 4 分/);assert.match(html,/你这一项原定付 4 分/);assert.match(html,/被玩家1杠走/);
// Added kong preserves its distinct type, succeeds only after all robbery passes.
r=table();r.canKong=true;r.wall=[26,5];r.players[0].melds=[{t:7,k:'peng'}];r.players[0].hand=[7,...readyKong];act(r,0,'bu',7,1000);assert.equal(r.beanEvents[0].type,'bu');act(r,0,'discard',5,1100);r.turn=0;r.phase='play';r.players[0].hand.push(25);r.drawn=25;act(r,0,'hu',undefined,2000);assertLedgers(r);assert.match(render(r),/你的补杠/);
// Robbed attempt appears as zero with a reason, not a completed kong.
r=table();r.canKong=true;r.wall=[5];r.players[0].melds=[{t:25,k:'peng'}];r.players[0].hand=[25,1,2,3,10,11,12,21,22,23,6];r.players[1].hand=dui.slice(0,-1);act(r,0,'bu',25,1000);act(r,1,'hu',undefined,1100);assertLedgers(r);assert.equal(r.result.beanAudit[0].status,'robbed');html=render(r);assert.match(html,/补杠被抢胡：没有完成开杠/);assert.deepEqual(r.result.beans,[0,0,0,0]);
// Hot burn keeps every canceled source explainable, but none adds a penalty.
r=table();r.canKong=true;r.wall=[25];r.players[0].hand=[1,1,1,1,...unreadyKong];r.players[0].river=[16];r.players[1].hand=dui.slice(0,-1);act(r,0,'gang',1,1000);act(r,0,'discard',25,1100);act(r,1,'hu',undefined,1200);assertLedgers(r);assert.equal(r.result.beanAudit[0].status,'burned');assert.ok(r.result.chickenAudit[0].every(d=>d.status==='burned'));assert.equal(r.result.values[0],0);html=render(r);assert.match(html,/热炮：自己的鸡豆全部烧掉/);assert.match(html,/牌型 8 ＋ 热炮额外 4 ＝ 12/);assert.match(html,/热炮：杠牌者自己的豆烧掉/);assert.match(html,/实际盈亏：胡 -12 ＋ 豆 0 ＋ 鸡 0 ＝ <b>-12/);
// A charge claimed by peng is removed, its exclusion and receiver are recorded.
r=table();r.turn=3;r.wall=[5,6];r.players[3].hand=[0];r.players[1].hand=[0,0,1,2,3,10,11,12,21,22,23,25,25];act(r,3,'discard',0,1000);act(r,1,'peng',undefined,1100);act(r,1,'discard',25,1200);win(r);assertLedgers(r);const removed=r.result.chickenAudit[3].find(d=>d.status==='claimed');assert.equal(removed.charge,true);assert.equal(removed.to,1);assert.equal(removed.actual,0);html=render(r,'3');assert.match(html,/被玩家1碰走，不再算你的弃牌鸡/);assert.match(html,/已取消/);
// Flip stacks explicitly with a charge, while keeping the own penalty separate.
r=table();r.wall=[8];r.players[1].river=[0];r.charges=[{tile:0,player:1,index:0,claimed:false}];win(r);assertLedgers(r);html=render(r,'1');assert.match(html,/1 张 × 5 分/);assert.match(html,/冲锋鸡 4 ＋ 翻牌鸡 1 ＝ 每张 5 分/);assert.match(html,/你未听牌的弃牌鸡 5 分/);assert.equal(r.result.values[1],-5);assert.equal(r.result.chicken[1],-5);
// Drawn round cancels tracked kong and held chicken with specific explanations.
r=table();r.turn=1;r.canKong=true;r.wall=[5];r.players[1].hand=[16,16,16,16,...unreadyKong];act(r,1,'gang',16,1000);r.turn=0;r.players[0].hand=[26];act(r,0,'discard',26,1200);assertLedgers(r);html=render(r,'1');assert.match(html,/流局：这次豆全部取消/);assert.match(html,/流局：本局鸡分全部取消/);assert.match(html,/实际盈亏：胡 0 ＋ 豆 0 ＋ 鸡 0 ＝ <b>0/);html=renderToStaticMarkup(React.createElement(ScoreOverview,{room:view(r,'1')}));assert.match(html,/流局 · 0 分/);
// Refresh returns the same bill; a new round clears events and keeps total score.
const snapshot=JSON.parse(JSON.stringify(r));assert.equal(render(snapshot,'1'),render(r,'1'));const scores=r.players.map(p=>p.score);r.players.forEach(p=>p.ready=true);start(r,3000);assert.deepEqual(r.beanEvents,[]);assert.deepEqual(r.claimedTiles,[]);assert.equal(r.result,null);assert.deepEqual(r.players.map(p=>p.score),scores);
// In-progress old rounds cannot claim to have recorded earlier kong events.
r=table();delete r.beanEvents;delete r.beanEventsComplete;delete r.claimedTiles;win(r);assert.equal(r.result.beanAuditComplete,false);assert.equal(r.result.claimedAuditComplete,false);assert.match(render(r),/未完整记录逐次杠的来源/);
// Historical result still renders actual saved amounts without inventing sources.
const old=view(r,'0');delete old.result.beanAudit;delete old.result.myChickenAudit;delete old.result.huParts;old.result.myChickenDetails=null;old.result.beanTransfers=null;html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:old}));assert.match(html,/未记录逐张鸡分来源/);assert.match(html,/尚未记录逐家豆分/);
// No-flip summary opens the detailed bill automatically in the table center.
r=table();win(r);html=renderToStaticMarkup(React.createElement(RoundEnd,{room:view(r,'0'),Tile:()=>null}));assert.match(html,/central-summary/);assert.match(html,/settlement-details" open=""/);assert.match(html,/赚了 12 分/);assert.match(html,/各付 4 分/);assert.match(html,/查看我的收付明细/);
console.log('PASS: actual kong/discard provenance, completed/canceled/robbed/burned/drawn item reasons, claimed-charge exclusion, flip stacking, private concealed tiles, persisted refresh, next-round reset, historical gaps, per-opponent explanations and automatic central bill.');
