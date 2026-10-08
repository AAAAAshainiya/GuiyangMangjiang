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
function mod(object){return new vm.SyntheticModule(Object.keys(object),function(){for(const k of Object.keys(object))this.setExport(k,object[k])})}
const imports={'react':mod(React),'react/jsx-runtime':mod(jsx),'lucide-react':mod(icons),'@/lib/game':mod(game),'@/lib/interaction':mod(interaction),'@/lib/table-client':mod(client),'@/components/ui/button':mod({Button:props=>React.createElement('button',props)})};
async function load(path){const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const m=new vm.SourceTextModule(source);await m.link(s=>imports[s]);await m.evaluate();return m.namespace}
const {TableActions}=await load('app/game-actions.tsx');const {SettlementDetails,ScoreOverview}=await load('app/game-social.tsx');
let calls=[];let props={options:['discard','gang:3','bu:9','hu'],phase:'play',busy:false,onAction:(...args)=>calls.push(args),seconds:20};
let tree=TableActions(props),html=renderToStaticMarkup(tree);
assert.match(html,/暗杠 4万/);assert.match(html,/补杠 1筒/);assert.match(html,/自摸/);assert.match(html,/20 秒/);assert.doesNotMatch(html,/>出牌</);
// Clicking the central concealed-kong button passes the exact tile to the action handler.
tree.props.children[1].props.children.find(button=>button.key==='gang:3').props.onClick();assert.deepEqual(calls,[['gang',3]]);
html=renderToStaticMarkup(React.createElement(TableActions,{...props,options:['hu','peng','gang','pass'],phase:'claim',claimText:'玩家1打出 4万',busy:true}));
assert.match(html,/玩家1打出 4万/);assert.match(html,/明杠/);assert.match(html,/>碰</);assert.match(html,/>胡</);assert.match(html,/>过</);assert.equal((html.match(/disabled=""/g)||[]).length,4);
assert.equal(renderToStaticMarkup(React.createElement(TableActions,{...props,options:['discard']})),'');assert.equal(renderToStaticMarkup(React.createElement(TableActions,{...props,phase:'done'})),'');
const room={me:0,players:[0,1,2,3].map(i=>({name:'玩家'+i})),result:{winner:0,from:-1,revealed:[true,false,false,false],huValues:[3,0,0,0],values:[13,7,0,12],hu:[9,-3,-3,-3],beans:[-4,4,0,0],chicken:[20,-4,-32,16],delta:[25,-3,-35,13],rooster:10,myChickenDetails:[{tile:0,source:'river',charge:true,count:1,unit:4,points:4},{tile:16,source:'hand',charge:false,count:4,unit:2,points:8},{tile:10,source:'hand',charge:false,count:1,unit:1,points:1}],beanTransfers:[{from:0,to:1,points:4}]}};
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room}));assert.match(html,/自己的鸡分：13/);assert.match(html,/冲锋鸡/);assert.match(html,/含翻牌鸡 \+1/);assert.match(html,/4 张 × 2 分/);assert.match(html,/<td(?: class="money-[a-z]+")?>\+3<\/td><td(?: class="money-[a-z]+")?>-4<\/td><td(?: class="money-[a-z]+")?>\+6<\/td><td(?: class="money-[a-z]+")?>\+5<\/td>/);assert.match(html,/胡 \+9 ＋ 豆 -4 ＋ 鸡 \+20 ＝ <b>\+25/);
const legacy={...room,result:{...room.result,myChickenDetails:null,beanTransfers:null}};
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:legacy}));assert.match(html,/未记录逐张鸡分来源/);assert.match(html,/尚未记录逐家豆分/);assert.match(html,/胡 \+9 ＋ 豆 -4 ＋ 鸡 \+20/);
const unready={...room,me:2,players:room.players.map(p=>({...p,melds:[]})),result:{...room.result,beanRequiresReady:true,revealed:[true,true,false,false],beanValues:[0,4,0,0],beans:[-4,12,-4,-4],delta:[25,5,-39,9],myChickenDetails:[],beanTransfers:[{from:0,to:1,points:4},{from:2,to:1,points:4},{from:3,to:1,points:4}]}};
html=renderToStaticMarkup(React.createElement(ScoreOverview,{room:unready}));assert.match(html,/<td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>0<\/td><td class="negative"><b>-39<\/b>/,'non-ready personal bean value is zero while actual payments remain');
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:unready}));assert.match(html,/你自己的杠不计豆，但仍需支付胡牌或听牌者的豆分/);assert.match(html,/胡 -3 ＋ 豆 -4 ＋ 鸡 -32 ＝ <b>-39/);
console.log('PASS: central action labels, exact kong callback, busy/finished states, claim tile context, personal sources, opponent payments and historical detail fallbacks.');
// New hot scoring keeps own hu base separate from the actual +4 payment.
const hot={me:0,players:room.players.map(p=>({...p,melds:[]})),result:{winner:1,from:0,scoringVersion:3,kind:'热炮',revealed:[true,true,true,false],eligible:[false,true,true,false],burned:[true,false,false,false],huParts:[{name:'大对子',points:8}],huValues:[0,8,0,0],huPayable:12,hotPenalty:4,beanRequiresReady:true,beanValues:[0,0,4,0],values:[0,0,2,0],hu:[-12,12,0,0],beans:[-4,-4,12,-4],chicken:[-2,-2,6,-2],delta:[-18,6,18,-6],myChickenDetails:[],chickenTransfers:[{from:0,to:2,points:2},{from:1,to:2,points:2},{from:3,to:2,points:2}],beanTransfers:[{from:0,to:2,points:4},{from:1,to:2,points:4},{from:3,to:2,points:4}]}};
html=renderToStaticMarkup(React.createElement(ScoreOverview,{room:hot}));assert.match(html,/大对子 8 ＝ 8 分。玩家0付 12 分。/);assert.match(html,/热炮额外 4 分/);assert.match(html,/热炮烧鸡豆/);assert.match(html,/<td(?: class="money-[a-z]+")?>8<\/td><td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>0<\/td><td class="positive"><b>\+6/);
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:hot}));assert.match(html,/你放了热炮/);assert.doesNotMatch(html,/你的杠计豆/);assert.match(html,/<td(?: class="money-[a-z]+")?>-12<\/td><td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>-12/);assert.match(html,/<td(?: class="money-[a-z]+")?>0<\/td><td(?: class="money-[a-z]+")?>-4<\/td><td(?: class="money-[a-z]+")?>-2<\/td><td(?: class="money-[a-z]+")?>-6/);assert.match(html,/胡 -12 ＋ 豆 -4 ＋ 鸡 -2 ＝ <b>-18/);
const nobodyReady={...hot,me:3,result:{...hot.result,values:[0,0,2,-4],delta:[-18,6,22,-10],chicken:[-2,-2,10,-6],chickenTransfers:[{from:0,to:2,points:2},{from:1,to:2,points:2},{from:3,to:2,points:6}],myChickenDetails:[{tile:0,source:'river',charge:true,count:1,unit:4,points:4}]}};
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:nobodyReady}));assert.match(html,/不收其他人的弃牌鸡罚分/);assert.match(html,/只向胡牌或听牌且未放热炮的人付分/);
console.log('PASS: additive hu explanation, hot surcharge and burn eligibility, own values, qualified chicken ledgers and actual opponent/net amounts.');
