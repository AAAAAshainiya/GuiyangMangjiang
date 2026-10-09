import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as interaction from '../lib/interaction.ts';
import {loadLocalLibrary} from './modules-v13.mjs';
let cursor=0,slots=[],effects=[];
const hooks={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useEffect(fn){effects.push(fn)}};
const mod=obj=>new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])});
function AvatarPicker(){return null}
const modules={'react':mod(hooks),'react/jsx-runtime':mod(jsx),'lucide-react':mod(icons),'@/components/ui/button':mod({Button:({children,...props})=>React.createElement('button',props,children)}),'./game-progress':mod({AvatarPicker}),'@/lib/interaction':mod(interaction)};
const source=ts.transpileModule(fs.readFileSync('app/game-entry.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(source);await m.link(n=>modules[n]);await m.evaluate();
const online=[],local=[];
const props={name:'小张',avatar:'🐼',code:'',tab:'create',busy:false,initialized:true,profileLoaded:true,onName:v=>props.name=v,onAvatar:v=>props.avatar=v,onCode:v=>props.code=v,onTab:v=>props.tab=v,onOnline:v=>online.push(v),onLocal:(...v)=>local.push(v)};
function render(){cursor=0;effects=[];return m.namespace.GameEntry(props)}
function nodes(t){if(!t||typeof t!=='object')return [];if(Array.isArray(t))return t.flatMap(nodes);return [t,...nodes(t.props?.children)]}
const text=t=>typeof t==='string'?t:Array.isArray(t)?t.map(text).join(''):text(t?.props?.children??'');
const click=label=>{const n=nodes(render()).find(n=>n.props?.onClick&&text(n)===label);assert(n,'button '+label);assert(!n.props.disabled);n.props.onClick()};
let t=render(),html=renderToStaticMarkup(t);assert.match(html,/id="nickname"/);assert.match(html,/更换头像/);assert.equal(nodes(t).filter(n=>n.props?.className?.startsWith('mode-choice')).length,3);assert.doesNotMatch(html,/创建房间|加入房间|开始游戏|开始教学|roomcode/);
click('🐼换头像');assert(nodes(render()).some(n=>n.type===AvatarPicker));nodes(render()).find(n=>n.type===AvatarPicker).props.onChange('🐔');assert.equal(props.avatar,'🐔');assert(!nodes(render()).some(n=>n.type===AvatarPicker));
nodes(render()).find(n=>n.props?.id==='nickname').props.onChange({target:{value:'阿青'}});assert.equal(props.name,'阿青');
click('多人模式好友联机 · 人机补位');assert.match(renderToStaticMarkup(render()),/创建房间/);assert.doesNotMatch(renderToStaticMarkup(render()),/开始游戏|开始教学/);const create=nodes(render()).find(n=>n.props?.className==='primary-button full');create.props.onClick();assert.deepEqual(online,['create']);
click('加入房间');t=render();assert(nodes(t).some(n=>n.props?.id==='roomcode'));assert.equal(nodes(t).find(n=>n.props?.className==='primary-button full').props.disabled,true);
nodes(t).find(n=>n.props?.id==='roomcode').props.onChange({target:{value:'ab-23'}});assert.equal(props.code,'AB23');t=render();const join=nodes(t).find(n=>n.props?.className==='primary-button full');assert.equal(join.props.disabled,false);join.props.onClick();assert.deepEqual(online,['create','join']);
click('单人模式三个人机 · 随时暂停');html=renderToStaticMarkup(render());assert.doesNotMatch(html,/roomcode|创建房间|加入房间/);click('快速 · 0.5 秒');click('开始游戏');assert.deepEqual(local,[['solo',true]]);assert.equal(props.name,'阿青');assert.equal(props.avatar,'🐔');
click('新手模式单机教学 · 逐步引导');html=renderToStaticMarkup(render());assert.doesNotMatch(html,/roomcode|创建房间|加入房间|普通 · 2 秒/);click('开始教学');assert.deepEqual(local,[['solo',true],['learn',false]]);
props.name=' ';assert.equal(nodes(render()).find(n=>n.props?.className==='primary-button full').props.disabled,true);props.name='阿青';props.initialized=false;assert.equal(nodes(render()).find(n=>n.props?.className==='primary-button full').props.disabled,false,'local play is independent of online initialization');props.busy=true;assert(nodes(render()).filter(n=>n.props?.className?.startsWith('mode-choice')).every(n=>n.props.disabled));props.busy=false;
slots=[];props.code='AB23';props.tab='join';render();for(const effect of effects)effect();html=renderToStaticMarkup(render());assert.match(html,/value="AB23"/);assert.match(html,/多人模式操作/);assert.doesNotMatch(html,/开始游戏|开始教学/);
console.log('PASS: actual entry separates all three modes, shares editable identity, collapses avatar choices, gates joining, honors fast choice, retains identity and opens invitation joining.');
const solo=await loadLocalLibrary('lib/solo.ts');let botStarts=0;
for(let i=0;i<25;i++){const game=new solo.SoloGame('阿青','🐔',1000,true);assert.equal(game.room.fast,true);if(game.room.turn!==0){botStarts++;assert.equal(game.room.deadline,1500);assert.equal(game.tick(1499),false)}}assert(botStarts>0);
console.log('PASS: chosen solo fast mode is active before dealing; first computer turn also waits 500 ms.');
