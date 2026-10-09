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
const events=await loadLocalLibrary('lib/table-events.ts');
function mod(obj){return new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])})}
const Button=({children,...props})=>React.createElement('button',props,children),dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,({children})=>React.createElement('div',null,children)]));
async function load(path,react=React){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const imports={'react':mod(react),'react/jsx-runtime':mod(jsx),'@/lib/game':mod(game),'lucide-react':mod(icons),'@/lib/interaction':mod(interaction),'@/lib/table-client':mod(client),'@/lib/table-events':mod(events),'@/components/ui/button':mod({Button}),'@/components/ui/dialog':mod(dialog)};const m=new vm.SourceTextModule(code);await m.link(n=>imports[n]);await m.evaluate();return m.namespace}
const rules=await load('app/game-rules.tsx'),social=await load('app/game-social.tsx');
let html=renderToStaticMarkup(React.createElement(rules.RuleTables));assert.equal((html.match(/<table/g)||[]).length,6);assert.match(html,/幺鸡/);assert.match(html,/乌骨鸡/);assert.match(html,/每张赔 5 分/);assert.match(html,/三家各付 8，赢家共收 24/);assert.match(html,/大对子热炮付 8＋4＝12/);assert.match(html,/自己打出的也不收、不扣，0分/);
for(const example of rules.HU_EXAMPLES){assert(game.pattern([...example.hand],example.melds),'every rendered example is an actual winning shape');const r=game.create('ABCD','0','甲');r.players=[game.player('0','甲')];r.players[0].hand=[...example.hand];r.players[0].melds=example.melds;r.heavenlyReady=[example.key==='heaven'];if(example.key==='heaven')assert(game.waits({...r.players[0],hand:example.hand.slice(0,-1)}).length);const score=game.huScore(r,0,example.key==='kong'?'杠上开花':'自摸');assert.equal(score.points,game.defaultRules().hu[example.key]);assert(score.parts.some(p=>p.name===example.name))}
const custom=game.defaultRules();custom.chickenTiles=[5];custom.chicken=7;custom.charge=11;custom.flip=2;custom.ming=6;custom.an=8;custom.bu=9;custom.hot=5;custom.hu.peng=9;
html=renderToStaticMarkup(React.createElement(rules.RuleTables,{rules:custom}));assert.match(html,/6万/);assert.doesNotMatch(html,/>幺鸡</);assert.match(html,/每张赔 13 分/);assert.match(html,/大对子热炮付 9＋5＝14/);assert.match(html,/合计收 24 分；自身豆 8/);
// The real editor's controls validate values, retain failed drafts, and submit tiles.
let cursor=0,slots=[],pending=[];
const hooks={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn){cursor++;pending.push(fn)}};
const controlled=await load('app/game-rules.tsx',hooks);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
function render(fn){cursor=0;pending=[];const t=fn();pending.forEach(fn=>fn());return t}
let submitted=[],fail=false;const props={rules:game.defaultRules(),onCancel:()=>{},onSave:async r=>{if(fail)throw new Error('网络未确认，请重试');submitted.push(r)}};
let tree=render(()=>controlled.RuleEditor(props));nodes(tree).find(n=>n.props?.['aria-label']==='1万固定鸡').props.onClick();tree=render(()=>controlled.RuleEditor(props));assert.equal(nodes(tree).find(n=>n.props?.['aria-label']==='1万固定鸡').props['aria-pressed'],false);
nodes(tree).find(n=>n.props?.['aria-label']==='普通固定鸡分数').props.onChange({target:{value:'-1'}});tree=render(()=>controlled.RuleEditor(props));await nodes(tree).find(n=>n.props?.children==='保存，下一局生效').props.onClick();await new Promise(setImmediate);tree=render(()=>controlled.RuleEditor(props));assert.match(renderToStaticMarkup(tree),/0—1000 的整数/);assert.equal(submitted.length,0);
nodes(tree).find(n=>n.props?.['aria-label']==='普通固定鸡分数').props.onChange({target:{value:'7'}});tree=render(()=>controlled.RuleEditor(props));fail=true;await nodes(tree).find(n=>n.props?.children==='保存，下一局生效').props.onClick();await new Promise(setImmediate);tree=render(()=>controlled.RuleEditor(props));assert.match(renderToStaticMarkup(tree),/网络未确认，请重试/);assert.equal(nodes(tree).find(n=>n.props?.['aria-label']==='普通固定鸡分数').props.value,7);
fail=false;await nodes(tree).find(n=>n.props?.children==='保存，下一局生效').props.onClick();await new Promise(setImmediate);assert.deepEqual(submitted[0].chickenTiles,[16,18]);assert.equal(submitted[0].chicken,7);
slots=[];const room={code:'ABCD',phase:'lobby',isHost:false,rules:game.defaultRules(),ruleRevision:1};tree=render(()=>controlled.RulesPublicPanel({room,busy:false,onSave:async()=>{}}));assert(nodes(tree).find(n=>n.props?.children==='编辑计分规则').props.disabled);assert.match(renderToStaticMarkup(tree),/仅房主可修改/);room.isHost=true;tree=render(()=>controlled.RulesPublicPanel({room,busy:false,onSave:async()=>{}}));assert.equal(nodes(tree).find(n=>n.props?.children==='编辑计分规则').props.disabled,false);room.phase='play';tree=render(()=>controlled.RulesPublicPanel({room,busy:false,onSave:async()=>{}}));assert(nodes(tree).find(n=>n.props?.children==='编辑计分规则').props.disabled);
// A canceled pure flip is visible and historical formulas use their saved rules.
const r=game.create('ABCD','0','甲');r.players=[0,1,2,3].map(i=>({...game.player(String(i),'玩家'+i),ready:true}));game.start(r,1000);r.heavenlyReady=[false,false,false,false];r.players.forEach(p=>{p.hand=[1,3,5,7,8,10,12,14,15,17,19,21,23];p.melds=[];p.river=[]});r.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];r.turn=0;r.drawn=25;r.wall=[0];r.players[1].river=[1];game.act(r,0,'hu',undefined,2000);
html=renderToStaticMarkup(React.createElement(social.SettlementDetails,{room:game.view(r,'1'),defaultOpen:true}));assert.match(html,/只是翻鸡、未与固定鸡重合，不收分也不扣分/);assert.match(html,/翻鸡免计/);assert.match(html,/已取消/);
const customBill=game.view(r,'1');customBill.result.rules=custom;customBill.result.rooster=5;customBill.result.myChickenAudit=[{tile:5,source:'river',charge:true,count:1,unit:13,points:13,status:'counted',actual:-13}];html=renderToStaticMarkup(React.createElement(social.SettlementDetails,{room:customBill}));assert.match(html,/冲锋鸡 11 ＋ 翻牌鸡 2 ＝ 每张 13 分/);
const publicView=game.view(r,'0'),Tile=({t,back})=>React.createElement('span',null,back?'牌背':game.tileName(t));publicView.players[1]={...publicView.players[1],revealed:true,melds:[{t:-1,k:'gang',hidden:true}],hand:[25]};html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room:publicView,Tile}));assert.match(html,/胡牌 \/ 听牌亮牌/);assert.match(html,/牌背/);
console.log('PASS: six readable scoring tables, all eight examples validated by actual engine, custom values/tiles reflected, host-only editor controls, invalid input/failed-draft retention, pure flip cancellation and snapshot bill formulas, central concealed showdown.');
