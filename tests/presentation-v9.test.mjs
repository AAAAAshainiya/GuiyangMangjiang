import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as game from '../lib/game.ts';
import * as interactions from '../lib/interaction.ts';
let cursor=0,slots=[];const copied=[],sent=[];
const room={code:'ABCD',me:0,isHost:true,round:0,phase:'lobby',options:[],waits:[],players:[0,1,2,3].map(i=>({name:'牌友'+i,bot:i>0,score:0,ready:true,count:0,melds:[],river:[]})),messages:[],interactions:[],logs:[],version:2};
const hooks={useState(value){const i=cursor++;if(!(i in slots))slots[i]=i===0&&value===null?room:value;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useCallback(fn){cursor++;return fn},useEffect(){cursor++}};
function stub(tag){return ({children,...props})=>React.createElement(tag,props,children)}
function ChatPanel(){return React.createElement('div',{className:'chat-controls'},'互动')}
const context=vm.createContext({Date,URL,crypto,location:{origin:'https://example.test'},navigator:{clipboard:{writeText:async text=>copied.push(text)}},history:{replaceState:()=>{}},setTimeout,clearTimeout});
const imports={'react':hooks,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/interaction':interactions,'@/lib/table-client':{tableRequest:async(url,init)=>{sent.push(JSON.parse(init.body));return room},TablePoller:class{}},'./game-audio':{SoundToggle:()=>null,useTableSound:()=>({enabled:false,toggle:async()=>{}})},'./game-interactions':{InteractionLayer:()=>null},'./game-actions':{TableActions:()=>null},'./game-social':{ChatPanel,ChatBubble:()=>null,RoundEnd:()=>null,ScoreOverview:()=>null,SettlementDetails:()=>null},'@/components/ui/button':{Button:stub('button')},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null])),'@/components/ui/tabs':Object.fromEntries(['Tabs','TabsContent','TabsList','TabsTrigger'].map(n=>[n,stub('div')])),'@/components/ui/switch':{Switch:stub('input')}};
const modules={};for(const [name,obj]of Object.entries(imports))modules[name]=new vm.SyntheticModule(Object.keys(obj),function(){for(const key of Object.keys(obj))this.setExport(key,obj[key])},{context});
const code=ts.transpileModule(fs.readFileSync('app/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(code,{context});await m.link(name=>modules[name]);await m.evaluate();
function render(){cursor=0;return m.namespace.default()}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);let result=[tree];if(typeof tree.type==='function'&&tree.type.name==='Seat')result.push(...nodes(tree.type(tree.props)));else result.push(...nodes(tree.props?.children));return result}
let tree=render(),all=nodes(tree),html=renderToStaticMarkup(tree);
assert.match(html,/table-center waiting"><span class="table-seal">贵阳<br\/>捉鸡<\/span><\/div>/);assert.doesNotMatch(html,/好牌，值得一起等/);
const self=all.find(n=>n.props?.className==='self-seat');assert(nodes(self).some(n=>n.type===ChatPanel));const hand=all.find(n=>n.props?.className==='hand-area');assert(!nodes(hand).some(n=>n.type===ChatPanel));
await all.find(n=>n.props?.['aria-label']==='复制邀请码').props.onClick();assert.deepEqual(copied,['ABCD']);await all.find(n=>n.props?.children==='复制邀请链接').props.onClick();assert.equal(copied[1],'https://example.test/?room=ABCD');
const panel=all.find(n=>n.type===ChatPanel);panel.props.onPick('tomato');tree=render();all=nodes(tree);const avatars=all.filter(n=>n.type==='button'&&n.props?.['data-avatar-seat']!==undefined);assert.equal(avatars.length,3);assert(avatars.every(n=>!n.props.disabled));assert.match(renderToStaticMarkup(tree),/点对方头像/);
await avatars.find(n=>n.props['data-avatar-seat']===1).props.onClick();assert.equal(sent[0].action,'interaction');assert.equal(sent[0].effect,'tomato');assert.equal(sent[0].target,1);assert.equal(sent[0].code,'ABCD');assert(sent[0].clientId);
// Exercise the real expanded panel and all nine selection callbacks.
await new Promise(setImmediate);slots=[];const selected=[];
const socialSource=ts.transpileModule(fs.readFileSync('app/game-social.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const social=new vm.SourceTextModule(socialSource,{context});await social.link(name=>modules[name]);await social.evaluate();
const props={room,onUpdate:()=>{},onBubbles:()=>{},onPick:effect=>selected.push(effect)};
function chat(){cursor=0;return social.namespace.ChatPanel(props)}
let panelTree=chat();nodes(panelTree).find(n=>n.props?.className==='chat-toggle').props.onClick();panelTree=chat();
const buttons=nodes(panelTree).filter(n=>interactions.INTERACTIONS.some(effect=>effect.name===n.props?.['aria-label']));assert.equal(buttons.length,9);assert.match(renderToStaticMarkup(panelTree),/聊天消息/);
buttons.find(n=>n.props['aria-label']==='扔鸡蛋').props.onClick();assert.deepEqual(selected,['egg']);assert.equal(nodes(chat()).some(n=>n.props?.className==='chat-panel'),false);
console.log('PASS: actual page render, minimal lobby center, interaction beside own avatar, code/link clipboard distinction and targeted-avatar submission.');
