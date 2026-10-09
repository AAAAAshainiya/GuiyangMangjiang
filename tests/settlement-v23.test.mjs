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
const training=await loadLocalLibrary('lib/training.ts'),solo=await loadLocalLibrary('lib/solo.ts'),events=await loadLocalLibrary('lib/table-events.ts');
const Button=({children,...props})=>React.createElement('button',props,children);
const dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,({children,open})=>n==='Dialog'&&!open?null:React.createElement('div',null,children)]));
function synthetic(obj){return new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])})}
async function component(file,extra={}){
 const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const imports={'react':React,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/training':training,'@/lib/table-events':events,'@/lib/interaction':interaction,'@/lib/table-client':client,'@/components/ui/button':{Button},'@/components/ui/dialog':dialog,...extra};
 const m=new vm.SourceTextModule(source);await m.link(n=>synthetic(imports[n]));await m.evaluate();return m.namespace;
}
const social=await component('app/game-social.tsx'),closedSocial=await component('app/game-social.tsx',{'react':{...React,useState:()=>[true,()=>{}]}}),progress=await component('app/game-progress.tsx',{'./game-social':social});
const Tile=({t,back})=>React.createElement('span',null,back?'牌背':game.tileName(t));
function next(room,busy=false,onAction=()=>{}){return progress.NextRound({room,busy,onAction})}
function button(tree){return tree.props.children.find(c=>c?.type===Button)}
function settlement(room){
 for(const stage of ['winner','flip','summary']){
  if(stage==='winner'&&room.result.winner<0||stage==='flip'&&room.result.flip===null)continue;
  const html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile,stage,nextRound:React.createElement(progress.NextRound,{room,busy:false,onAction:()=>{}})}));assert(html.length>0);
 }
 const html=renderToStaticMarkup(React.createElement(closedSocial.RoundEnd,{room,Tile,nextRound:React.createElement(progress.NextRound,{room,busy:false,onAction:()=>{}})}));assert.match(html,/下一局操作/);
 const compact=!!room.solo||!!room.local&&room.lesson.settlementStep>=4;
 assert.equal(html.includes('round-next-panel-single'),compact);assert.equal(html.includes('next-round-single'),compact);
 renderToStaticMarkup(React.createElement(progress.HistoryPanel,{room}));
}
function finish(r,tick){let now=1000;for(let n=0;n<1000&&r.phase!=='done';n++){now=Math.max(now+1,r.deadline);tick(now)}assert.equal(r.phase,'done');return now}
let soloGames=0,onlineGames=0;
// Real SoloGame snapshots include BOTH local and solo, and have no lesson.
// Rendering the real next-round child in summary/closed summary caught the crash.
for(const fast of [false,true])for(let run=0;run<4;run++){
 const s=new solo.SoloGame('我','🐼',1000,fast);let now=1000;
 for(let n=0;n<1000&&s.room.phase!=='done';n++){
  if(s.pausedAt!==null){s.resume(now);continue}
  const opts=game.options(s.room,0),k=opts.find(x=>x.startsWith('gang:')||x.startsWith('bu:'));
  if(opts.length){now++;if(opts.includes('hu'))s.human('hu',undefined,now);else if(s.room.phase==='claim')s.human(opts[0],undefined,now);else if(k){const [a,t]=k.split(':');s.human(a,Number(t),now)}else s.human('discard',game.suggest(s.room.players[0]),now)}
  else{now=Math.max(now+1,s.room.deadline);s.tick(now)}
 }
 assert.equal(s.room.phase,'done');assert.equal(s.room.players[0].managed,false);const room=s.snapshot(now);
 assert(room.solo&&room.local);assert.equal(room.lesson,undefined);settlement(room);
 assert.equal(button(next(room)).props.disabled,false);assert.equal(button(next(room,true)).props.disabled,true);
 const restored=solo.SoloGame.restore(s.serialize(now),now);assert(restored);settlement(restored.snapshot(now));
 const scores=restored.room.players.map(p=>p.score);button(next(restored.snapshot(now),false,a=>restored.human(a,undefined,now))).props.onClick();
 assert.equal(restored.room.round,2);assert.deepEqual(restored.room.players.map(p=>p.score),scores);assert.equal(restored.room.history.length,1);
 renderToStaticMarkup(React.createElement(progress.HistoryPanel,{room:restored.snapshot(now)}));soloGames++;
}
for(const humans of [1,2,4])for(const fast of [false,true]){
 const r=game.create('1234','p0','玩家甲');r.players=Array.from({length:4},(_,i)=>game.player('p'+i,'玩家'+i,i>=humans));r.players.forEach(p=>{p.ready=true;p.managed=!p.bot});r.fast=fast;game.start(r,1000);const now=finish(r,n=>game.advance(r,n));
 for(let i=0;i<humans;i++){const room=game.view(r,'p'+i);settlement(room);assert.equal(button(next(room)).props.disabled,false)}
 r.players.forEach(p=>p.ready=true);const host=game.view(r,'p0');assert.equal(button(next(host)).props.disabled,false);let action;button(next(host,false,a=>action=a)).props.onClick();assert.equal(action,'start');
 if(humans>1)assert.equal(button(next(game.view(r,'p1'))).props.disabled,true);
 game.start(r,now);assert.equal(r.round,2);onlineGames++;
}
for(let run=0;run<3;run++){
 const t=new training.TrainingGame('学习者','🐼');for(let i=0;i<training.LESSON_STEPS.length;i++)t.next();
 for(let n=0;n<1000&&t.room.phase!=='done';n++){
  if(t.gate||!t.needsHuman())t.next();else{const opts=game.options(t.room,0),k=opts.find(x=>x.startsWith('gang:')||x.startsWith('bu:'));if(opts.includes('hu'))t.human('hu');else if(t.room.phase==='claim')t.human(opts[0]);else if(k){const[a,tile]=k.split(':');t.human(a,Number(tile))}else t.human('discard',game.suggest(t.room.players[0]));}
 }
 assert.equal(t.room.phase,'done');
 for(let step=0;step<=4;step++){
  const room=t.snapshot();assert.equal(room.lesson.settlementStep,step);settlement(room);assert.equal(button(next(room)).props.disabled,step<4);
  const restored=training.TrainingGame.restore(t.serialize());assert(restored);settlement(restored.snapshot());
  if(step<4){assert.throws(()=>t.human('ready'),/四步结算讲解/);t.next()}
 }
 const scores=t.room.players.map(p=>p.score);button(next(t.snapshot(),false,a=>t.human(a))).props.onClick();assert.equal(t.room.round,2);assert.deepEqual(t.room.players.map(p=>p.score),scores);
}
console.log(`PASS: real end-game component rendering and restore for ${soloGames} normal/fast solo games; ${onlineGames} multiplayer games with 1/2/4 humans; 3 tutorial games with all four lesson gates; actual next-round callbacks preserve scores and history.`);
{
 const r=game.create('STOP','p0','房主');r.players=Array.from({length:4},(_,i)=>({...game.player('p'+i,'牌友'+i),ready:true}));game.start(r,1000);game.terminateRound(r,0,1500);
 for(let i=0;i<4;i++){
  const room=game.view(r,'p'+i);settlement(room);const html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile,stage:'summary',nextRound:React.createElement(progress.NextRound,{room,busy:false,onAction:()=>{}})}));
  assert.match(html,/房主已终止本局/);assert.match(html,/房主终止 · 0 分/);assert.match(html,/保留此前累计积分/);assert.doesNotMatch(html,/牌墙已摸完/);assert.equal(room.history[0].bill.result.terminated,true);
 }
}
console.log('PASS: real terminated-room settlement and historical bills render for all four players, show host cancellation and zero net, and keep next-round controls.');
