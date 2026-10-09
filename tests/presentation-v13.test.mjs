import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
const training=await loadLocalLibrary('lib/training.ts');
function moduleFor(obj){return new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])})}
const imports={'react':moduleFor(React),'react/jsx-runtime':moduleFor(jsx),'@/lib/game':moduleFor(game),'@/lib/training':moduleFor(training),'./game-social':moduleFor({ScoreOverview:()=>null,SettlementDetails:()=>null}),'@/components/ui/button':moduleFor({Button:({children,...props})=>React.createElement('button',props,children)}),'@/components/ui/dialog':moduleFor(Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null])))};
const source=ts.transpileModule(fs.readFileSync('app/game-progress.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const mod=new vm.SourceTextModule(source);await mod.link(name=>imports[name]);await mod.evaluate();const {AvatarPicker,NextRound,HistoryPanel,RecoveryBanner,TutorialPanel}=mod.namespace;
const calls=[],room={phase:'done',me:0,isHost:true,completedRounds:3,players:[{name:'我',ready:false,score:13},{name:'小北',ready:false,score:-7},{name:'阿青',ready:true,score:3},{name:'阿川',ready:true,score:-9}],history:[],roundSummaries:[]};
function render(Component,props){return renderToStaticMarkup(React.createElement(Component,props))}
let html=render(NextRound,{room,busy:false,onAction:a=>calls.push(a)});assert.match(html,/准备下一局/);assert.match(html,/还在等：我、小北/);room.players[0].ready=true;room.players[1].ready=true;html=render(NextRound,{room,busy:false,onAction:()=>{}});assert.match(html,/大家已准备好/);assert.match(html,/开始下一局/);
html=render(AvatarPicker,{value:'🐯',onChange:()=>{}});assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);assert.equal((html.match(/<button/g)||[]).length,8);
html=render(RecoveryBanner,{report:{title:'期间动态',lines:['小北打出三万']},managed:true,busy:false,onResume:()=>{},onDismiss:()=>{}});assert.match(html,/已进入托管/);assert.match(html,/恢复手动操作/);assert.match(html,/小北打出三万/);
html=render(HistoryPanel,{room:{...room,roundSummaries:[{round:3,players:room.players,delta:[9,-3,-3,-3],winner:0,kind:'自摸'}],history:[{round:3,bill:{}}]}});assert.match(html,/已完成 3 局/);assert.match(html,/查看我的账单/);assert.match(html,/累计/);
const local=new training.TrainingGame();html=render(TutorialPanel,{room:local.snapshot(),preview:null,prompt:[],onNext:()=>{},onTour:()=>{}});assert.match(html,/你的手牌与新摸的牌/);assert.match(html,/下一步/);for(let i=0;i<training.LESSON_STEPS.length;i++)local.next();for(let steps=0;steps<30&&!local.needsHuman();steps++)local.next();if(local.gate)local.next();const t=game.suggest(local.room.players[0]);html=render(TutorialPanel,{room:local.snapshot(),preview:training.discardPreview(local.room,t),prompt:local.prompt(),onNext:()=>{},onTour:()=>{}});assert.match(html,/准备打/);assert.match(html,/确认出牌/);assert.match(html,/操作解释/);assert.doesNotMatch(html,/邀请码|邀请链接/);
console.log('PASS: v13 actual component output for direct next-round readiness/waiting seats, avatars, managed recovery, historical ledger and detailed contextual beginner teaching.');

// A randomly selected bot dealer must not tell the learner to discard first.
const firstRandom=crypto.getRandomValues;crypto.getRandomValues=function(a){firstRandom.call(crypto,a);a[0]-=a[0]%4;a[0]+=1;return a};let botFirst;try{botFirst=new training.TrainingGame()}finally{crypto.getRandomValues=firstRandom}for(let i=0;i<training.LESSON_STEPS.length;i++)botFirst.next();html=render(TutorialPanel,{room:botFirst.snapshot(),preview:null,prompt:[],onNext:()=>{},onTour:()=>{}});assert.match(html,/点击继续，查看人机行动/);assert.doesNotMatch(html,/现在由你选择出牌/);
