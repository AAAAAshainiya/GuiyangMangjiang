import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
import * as interaction from '../lib/interaction.ts';
import * as client from '../lib/table-client.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const events=await loadLocalLibrary('lib/table-events.ts'),training=await loadLocalLibrary('lib/training.ts');
const plain=[1,2,3,4,5,6,10,11,12,21,21,21,25,25],dui=[1,1,1,4,4,4,10,10,10,21,21,21,25,25],non=[1,3,5,7,8,10,12,14,15,17,19,21,23];
function table(){const r=game.create('ABCD','0','我');r.players=[0,1,2,3].map(i=>({...game.player(String(i),['我','小北','单吊牌友','未听牌友'][i]),ready:true}));game.start(r,1000);r.heavenlyReady=[false,false,false,false];r.turn=0;r.wall=[8];r.drawn=25;r.players.forEach(p=>{p.melds=[];p.river=[];p.hand=[...non]});r.players[0].hand=[...plain];r.players[1].hand=plain.slice(0,-1);r.players[2].hand=[26];r.players[2].melds=[0,3,10,21].map(t=>({t,k:'peng'}));return r}
let r=table();game.act(r,0,'hu',undefined,2000);
assert.equal(r.result.winningTile,25);assert.deepEqual(r.result.readyInfo.map(p=>p.ready),[true,true,true,false]);
assert.deepEqual(r.result.readyInfo[1].waits,[{tile:25,discard:false,selfDraw:true}]);assert.deepEqual(r.result.readyInfo[2].waits,[{tile:26,discard:true,selfDraw:true}]);
assert.equal(r.result.readyInfo[3].waits.length,0);assert.equal(r.result.delta.reduce((a,b)=>a+b),0);
const original=JSON.parse(JSON.stringify(r.result.readyInfo));r.players.forEach(p=>p.ready=true);game.start(r,3000);const history=game.view(r,'0').history[0].bill;
assert.deepEqual(history.result.readyInfo,original);assert.equal(history.result.winningTile,25);assert.equal(history.players[3].hand.length,0);assert(!JSON.stringify(history).includes('"id":'));
r=table();r.players[0].hand=[...dui];r.players[1].hand=dui.slice(0,-1);r.afterKong=true;game.act(r,0,'discard',25,1100);for(const k of Object.keys(r.claim.choices))game.act(r,Number(k),Number(k)===1?'hu':'pass',1200);
assert.equal(r.result.winningTile,25);assert.equal(r.result.kind,'热炮');assert(r.result.readyInfo[0].ready);assert(r.result.burned[0]);assert.equal(r.result.eligible[0],false);const hotBill=game.view(r,'0');
r=table();r.players[0].hand=[7,1,2,3,10,11,12,21,22,23,25];r.players[0].melds=[{t:7,k:'peng'}];r.players[1].hand=[0,1,2,9,10,11,18,19,20,23,24,25,7];r.canKong=true;game.act(r,0,'bu',7,1100);assert(r.claim.rob);for(const k of Object.keys(r.claim.choices))game.act(r,Number(k),Number(k)===1?'hu':'pass',1200);assert.equal(r.result.winningTile,7);assert.equal(r.result.kind,'抢杠胡');
r=table();r.players.forEach(p=>{p.hand=[...non];p.melds=[]});r.wall=[];game.act(r,0,'discard',23,1100);assert.equal(r.result.winner,-1);assert.equal(r.result.winningTile,null);assert(r.result.delta.every(x=>x===0));const drawnBill=game.view(r,'0');
function mod(obj){return new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])})}
const Button=({children,...props})=>React.createElement('button',props,children),dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,({children,open})=>k==='Dialog'&&!open?null:React.createElement('div',null,children)]));
async function load(path,extra={}){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const imports={'react':React,'react/jsx-runtime':jsx,'@/lib/game':game,'lucide-react':icons,'@/lib/interaction':interaction,'@/lib/table-client':client,'@/lib/table-events':events,'@/lib/training':training,'@/components/ui/button':{Button},'@/components/ui/dialog':dialog,...extra};const m=new vm.SourceTextModule(code);await m.link(n=>mod(imports[n]));await m.evaluate();return m.namespace}
const social=await load('app/game-social.tsx');const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
let html=render(social.ReadySummary,{room:history});assert.match(html,/我（你）/);assert.match(html,/已胡牌/);assert.match(html,/已听牌/);assert.match(html,/未听牌/);assert.match(html,/仅自摸/);assert.match(html,/接炮／自摸/);assert.match(html,/tiles\/25.webp/);assert.match(html,/tiles\/26.webp/);assert.doesNotMatch(html,/tiles\/23.webp/);
html=render(social.ReadySummary,{room:hotBill});assert.match(html,/放热炮 · 自己的鸡豆烧掉/);assert.equal((html.match(/有收鸡、收豆资格/g)||[]).length,2,'hot player remains ready but cannot collect their chicken or beans');
html=render(social.ReadySummary,{room:drawnBill});assert.match(html,/流局 · 本局不加扣分/);assert.doesNotMatch(html,/有收鸡、收豆资格/);
const old=JSON.parse(JSON.stringify(history));delete old.result.readyInfo;delete old.result.winningTile;html=render(social.ReadySummary,{room:old});assert.match(html,/已听牌/);assert.match(html,/25.webp/);delete old.result.waitTiles;html=render(social.ReadySummary,{room:old});assert.match(html,/这局未记录具体听牌牌面/);assert.doesNotMatch(html,/25.webp/);
let selected=null;const progress=await load('app/game-progress.tsx',{'react':{...React,useState:()=>[selected,v=>selected=v]},'./game-social':social});
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
const room={...history,completedRounds:1,history:[{round:1,bill:history}],roundSummaries:[{round:1,players:history.players,winner:0,kind:'自摸',delta:history.result.delta}],isHost:true};
let tree=progress.HistoryPanel({room});nodes(tree).find(n=>n.type==='button'&&n.props.children==='查看我的账单').props.onClick();tree=progress.HistoryPanel({room});html=renderToStaticMarkup(tree);assert.match(html,/本局听牌与胡牌情况/);assert.match(html,/仅自摸/);assert.match(html,/接炮／自摸/);assert.match(html,/查看我的收付明细/);assert.match(html,/胡牌 \/ 听牌亮牌/);
const next={phase:'done',me:0,isHost:true,players:[{name:'我',ready:false},{name:'小北',ready:false},{name:'电脑',ready:true},{name:'电脑二',ready:true}]};let calls=[];
tree=progress.NextRound({room:next,busy:false,onAction:a=>calls.push(a)});html=renderToStaticMarkup(tree);assert.equal((html.match(/<button/g)||[]).length,1);assert.doesNotMatch(html,/看完账单|保留.*累计|<strong/);assert.match(html,/还在等：我、小北/);nodes(tree).find(n=>n.type===Button).props.onClick();assert.deepEqual(calls,['ready']);
next.players[0].ready=true;tree=progress.NextRound({room:next,busy:false,onAction:()=>{}});assert(nodes(tree).find(n=>n.type===Button).props.disabled);
next.players[1].ready=true;calls=[];tree=progress.NextRound({room:next,busy:false,onAction:a=>calls.push(a)});assert.equal(nodes(tree).find(n=>n.type===Button).props.disabled,false);nodes(tree).find(n=>n.type===Button).props.onClick();assert.deepEqual(calls,['start']);
next.isHost=false;tree=progress.NextRound({room:next,busy:false,onAction:()=>{}});assert(nodes(tree).find(n=>n.type===Button).props.disabled);assert.match(renderToStaticMarkup(tree),/还在等：房主开局/);
tree=progress.NextRound({room:{...next,solo:true},busy:false,onAction:()=>{}});assert.equal(nodes(tree).find(n=>n.type===Button).props.disabled,false);assert.doesNotMatch(renderToStaticMarkup(tree),/<p/);
for(const step of [0,3,4]){tree=progress.NextRound({room:{...next,local:true,lesson:{settlementStep:step}},busy:false,onAction:()=>{}});assert.equal(Boolean(nodes(tree).find(n=>n.type===Button).props.disabled),step<4)}
console.log('PASS: final waits/self-draw vs discard legality, actual self-draw/discard/robbed-kong winning tiles, hot-ready vs scoring eligibility, draw zero, frozen historical waits/privacy and actual opened historical bill, legacy fallback, one compact next-game button with readiness/host/lesson guards.');
