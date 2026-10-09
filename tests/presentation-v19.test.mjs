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
const Button=({children,...props})=>React.createElement('button',props,children),dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,({children,open})=>k==='Dialog'&&!open?null:React.createElement('div',null,children)]));
async function load(path,react=React){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const imports={'react':mod(react),'react/jsx-runtime':mod(jsx),'@/lib/game':mod(game),'lucide-react':mod(icons),'@/lib/interaction':mod(interaction),'@/lib/table-client':mod(client),'@/lib/table-events':mod(events),'@/components/ui/button':mod({Button}),'@/components/ui/dialog':mod(dialog)};const m=new vm.SourceTextModule(code);await m.link(n=>imports[n]);await m.evaluate();return m.namespace}

let cursor=0,slots=[],pending=[];
const hooks={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn){cursor++;pending.push(fn)}};
const rules=await load('app/game-rules.tsx',hooks);
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
const room={code:'ABCD',phase:'lobby',isHost:true,rules:game.defaultRules(),ruleRevision:3};room.rules.chicken=7;
const props={room,busy:false,onSave:async r=>{room.rules=r}};
function render(){cursor=0;pending=[];const t=rules.RulesPublicPanel(props);pending.forEach(fn=>fn());return t}
let tree=render(),html=renderToStaticMarkup(tree);
assert.equal((html.match(/<button/g)||[]).length,2);assert.match(html,/查看扣分规则/);assert.match(html,/修改扣分规则/);assert.doesNotMatch(html,/<table|固定鸡牌种|第 3 版/);
nodes(tree).find(n=>n.props?.children==='查看扣分规则').props.onClick();tree=render();html=renderToStaticMarkup(tree);assert.equal((html.match(/<table/g)||[]).length,6);assert.match(html,/第 3 版/);assert.match(html,/每张赔 7 分/);
nodes(tree).find(n=>n.props?.open===true&&n.props?.onOpenChange).props.onOpenChange(false);tree=render();assert.doesNotMatch(renderToStaticMarkup(tree),/<table/);
nodes(tree).find(n=>n.props?.children==='修改扣分规则').props.onClick();tree=render();assert(nodes(tree).some(n=>n.type===rules.RuleEditor));assert.match(renderToStaticMarkup(tree),/保存，下一局生效/);
nodes(tree).find(n=>n.type===rules.RuleEditor).props.onCancel();tree=render();assert.equal((renderToStaticMarkup(tree).match(/<button/g)||[]).length,2);
for(const changed of [{isHost:false,phase:'lobby'},{isHost:true,phase:'play'},{isHost:true,phase:'done'}]){Object.assign(room,changed);props.settled=changed.phase!=='done';tree=render();assert(nodes(tree).find(n=>n.props?.children==='修改扣分规则').props.disabled);assert(!nodes(tree).find(n=>n.props?.children==='查看扣分规则').props.disabled)}
room.phase='done';props.settled=true;tree=render();assert.equal(nodes(tree).find(n=>n.props?.children==='修改扣分规则').props.disabled,false);props.busy=true;tree=render();assert(nodes(tree).find(n=>n.props?.children==='修改扣分规则').props.disabled);
console.log('PASS: default panel has exactly two buttons, view opens six current-rule tables and closes, host editor opens/cancels, active/guest/busy permissions preserved.');
