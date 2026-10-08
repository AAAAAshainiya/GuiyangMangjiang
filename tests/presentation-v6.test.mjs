import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
function mod(object){return new vm.SyntheticModule(Object.keys(object),function(){for(const k of Object.keys(object))this.setExport(k,object[k])})}
const imports={'react':mod(React),'react/jsx-runtime':mod(jsx),'lucide-react':mod(icons),'@/lib/game':mod(game),'@/components/ui/button':mod({Button:props=>React.createElement('button',props)})};
async function load(path){const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const m=new vm.SourceTextModule(source);await m.link(s=>imports[s]);await m.evaluate();return m.namespace}
const {TableActions}=await load('app/game-actions.tsx');const {SettlementDetails}=await load('app/game-social.tsx');
let calls=[];let props={options:['discard','gang:3','bu:9','hu'],phase:'play',busy:false,onAction:(...args)=>calls.push(args),seconds:20};
let tree=TableActions(props),html=renderToStaticMarkup(tree);
assert.match(html,/暗杠 4万/);assert.match(html,/补杠 1筒/);assert.match(html,/自摸/);assert.match(html,/20 秒/);assert.doesNotMatch(html,/>出牌</);
// Clicking the central concealed-kong button passes the exact tile to the action handler.
tree.props.children[1].props.children.find(button=>button.key==='gang:3').props.onClick();assert.deepEqual(calls,[['gang',3]]);
html=renderToStaticMarkup(React.createElement(TableActions,{...props,options:['hu','peng','gang','pass'],phase:'claim',claimText:'玩家1打出 4万',busy:true}));
assert.match(html,/玩家1打出 4万/);assert.match(html,/明杠/);assert.match(html,/>碰</);assert.match(html,/>胡</);assert.match(html,/>过</);assert.equal((html.match(/disabled=""/g)||[]).length,4);
assert.equal(renderToStaticMarkup(React.createElement(TableActions,{...props,options:['discard']})),'');assert.equal(renderToStaticMarkup(React.createElement(TableActions,{...props,phase:'done'})),'');
const room={me:0,players:[0,1,2,3].map(i=>({name:'玩家'+i})),result:{winner:0,from:-1,revealed:[true,false,false,false],huValues:[3,0,0,0],values:[13,7,0,12],hu:[9,-3,-3,-3],beans:[-4,4,0,0],chicken:[20,-4,-32,16],delta:[25,-3,-35,13],rooster:10,myChickenDetails:[{tile:0,source:'river',charge:true,count:1,unit:4,points:4},{tile:16,source:'hand',charge:false,count:4,unit:2,points:8},{tile:10,source:'hand',charge:false,count:1,unit:1,points:1}],beanTransfers:[{from:0,to:1,points:4}]}};
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room}));assert.match(html,/自己的鸡分：13/);assert.match(html,/冲锋鸡/);assert.match(html,/含翻牌鸡 \+1/);assert.match(html,/4 张 × 2 分/);assert.match(html,/<td>\+3<\/td><td>-4<\/td><td>\+6<\/td><td>\+5<\/td>/);assert.match(html,/胡 \+9 ＋ 豆 -4 ＋ 鸡 \+20 ＝ <b>\+25/);
const legacy={...room,result:{...room.result,myChickenDetails:null,beanTransfers:null}};
html=renderToStaticMarkup(React.createElement(SettlementDetails,{room:legacy}));assert.match(html,/未记录逐张鸡分来源/);assert.match(html,/尚未记录逐家豆分/);assert.match(html,/胡 \+9 ＋ 豆 -4 ＋ 鸡 \+20/);
console.log('PASS: central action labels, exact kong callback, busy/finished states, claim tile context, personal sources, opponent payments and historical detail fallbacks.');
