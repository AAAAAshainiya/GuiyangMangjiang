import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
import * as client from '../lib/table-client.ts';
import * as interaction from '../lib/interaction.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const training=await loadLocalLibrary('lib/training.ts'),solo=await loadLocalLibrary('lib/solo.ts'),selection=await loadLocalLibrary('lib/selection.ts'),events=await loadLocalLibrary('lib/table-events.ts');
const Button=({children,...p})=>React.createElement('button',p,children),dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,({children})=>React.createElement('div',null,children)]));
function mod(o){return new vm.SyntheticModule(Object.keys(o),function(){for(const k of Object.keys(o))this.setExport(k,o[k])})}
async function component(file,extra={}){const imports={'react':React,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/training':training,'@/lib/table-events':events,'@/lib/table-client':client,'@/lib/interaction':interaction,'@/components/ui/button':{Button},'@/components/ui/dialog':dialog,...extra},m=new vm.SourceTextModule(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText);await m.link(n=>mod(imports[n]));await m.evaluate();return m.namespace}
const social=await component('app/game-social.tsx'),coach=await component('app/game-coach.tsx'),progress=await component('app/game-progress.tsx',{'./game-social':social});
// Same tile after a sorted draw, duplicate tile identity, meld consumption and new round.
let r={code:'1234',round:1,me:0,phase:'play',players:[{hand:[1,4,4,7]}]},chosen=selection.selectHandTile(r,2);assert.equal(selection.selectedHandIndex(r,chosen),2);
r.players[0].hand=[0,1,4,4,7];assert.equal(selection.selectedHandIndex(r,chosen),3);r.phase='claim';assert.equal(selection.selectedHandIndex(r,chosen),3);r.players[0].hand=[0,1,7];assert.equal(selection.selectedHandIndex(r,chosen),null);r.players[0].hand=[4];r.round=2;assert.equal(selection.selectedHandIndex(r,chosen),null);
// Name collisions include humans, all candidate names, fallback numbering and local modes.
const names=['黔灵阿青','花溪小北','南明阿川','观山小禾','乌当阿林','云岩小溪','电脑牌友1'].map(name=>({name}));assert.equal(game.nextBotName(names),'电脑牌友2');assert.equal(new Set(new solo.SoloGame('黔灵阿青').room.players.map(p=>p.name)).size,4);assert.equal(new Set(new training.TrainingGame('花溪小北').room.players.map(p=>p.name)).size,4);
// Real engine results: gross receipts less deductions must match every saved net.
let cases=0;
for(let n=0;n<24;n++){
 const r=game.create('1234','0','我');r.players=Array.from({length:4},(_,i)=>({...game.player(String(i),'牌友'+i),ready:true}));r.fast=true;game.start(r,1000);r.players.forEach(p=>p.managed=true);let now=1000;
 for(let k=0;k<1000&&r.phase!=='done';k++){now=Math.max(now+1,r.deadline);game.advance(r,now)}assert.equal(r.phase,'done');
 for(let me=0;me<4;me++){
  const room=game.view(r,String(me)),ledger=social.settlementLedger(room);assert(ledger.complete);assert.equal(ledger.received-ledger.paid,r.result.delta[me]);assert(ledger.paid>=0&&ledger.received>=0);
  const html=renderToStaticMarkup(React.createElement(social.SettlementDetails,{room,defaultOpen:true}));assert.match(html,/本局扣分明细/);assert.match(html,new RegExp('合计 '+ledger.paid+' 分'));assert.match(html,/不另扣一次/);
  const history=room.history[0].bill;assert.equal(social.settlementLedger(history).paid,ledger.paid);cases++;
 }
}
// Hot penalty is distinct from hu; own burned chicken isn't charged twice.
const hot={me:1,players:Array.from({length:4},(_,i)=>({name:'牌友'+i})),result:{winner:0,from:1,kind:'热炮',huPayable:12,hotPenalty:4,scoringVersion:3,values:[5,0,3,-4],eligible:[true,false,true,false],beanTransfers:[{from:1,to:2,points:4},{from:2,to:0,points:4},{from:0,to:2,points:4}],delta:[28,-24,12,-16]}};
const debit=social.settlementLedger(hot);assert.equal(debit.paid,24);assert.equal(debit.received,0);assert.equal(debit.items.find(t=>t.reason==='热炮额外扣分').points,4);assert(!debit.items.some(t=>t.reason==='自己未听牌弃鸡扣分'));
const old={...hot,result:{...hot.result,beanTransfers:null}};assert.equal(social.settlementLedger(old).complete,false);assert.match(renderToStaticMarkup(React.createElement(social.SettlementHeadline,{room:old})),/旧账单未记录/);
// Each live training step has real selectors and at most two visible explanations.
const t=new training.TrainingGame('学习者');
for(let i=0;i<training.LESSON_STEPS.length;i++){
 const room=t.snapshot(),note=coach.coachNote(room,null,null,[]);assert(note.targets.length<=2);const html=renderToStaticMarkup(React.createElement(coach.TableCoach,{room,preview:null,selection:null,prompt:[],onNext:()=>t.next(),onTour:()=>{},onFull:()=>{}}));assert.match(html,/牌桌教学批注/);assert.match(html,/下一步/);assert.match(html,/coach-markers/);t.next();
}
for(let n=0;n<1000&&t.room.phase!=='done';n++){
 if(t.gate||!t.needsHuman())t.next();else{const opts=game.options(t.room,0),k=opts.find(o=>o.startsWith('gang:')||o.startsWith('bu:'));if(opts.includes('hu'))t.human('hu');else if(t.room.phase==='claim')t.human(opts[0]);else if(k){const[a,tile]=k.split(':');t.human(a,Number(tile))}else t.human('discard',game.suggest(t.room.players[0]))}
 if(t.room.phase!=='done'){const room=t.snapshot();assert(coach.coachNote(room,null,null,t.prompt()).targets.length<=2);if(t.gate){assert(t.lastAction);assert(!('tile' in t.snapshot().lesson.lastAction));const restored=training.TrainingGame.restore(t.serialize());assert.equal(restored.lastAction.action,t.lastAction.action)}}
}
assert.equal(t.room.phase,'done');
for(let step=0;step<=4;step++){
 const room=t.snapshot(),guide=React.createElement(progress.TutorialPanel,{compact:true,room,preview:null,prompt:[],onNext:()=>t.next(),onTour:()=>{}}),html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile:()=>null,tutorialGuide:guide,stage:'summary'}));assert.match(html,/tutorial-inline/);assert.match(html,new RegExp('data-settlement-step="'+step+'"'));if(step<4)t.next();
}
console.log(`PASS: v27 selection identity, unique bot names, ${cases} actual and historical gross ledgers, hot/legacy bills, table annotations, no hidden tile in coaching, full tutorial and all four settlement guides.`);
