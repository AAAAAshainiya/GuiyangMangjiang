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
import {loadLocalLibrary} from './modules-v13.mjs';
const training=await loadLocalLibrary('lib/training.ts'),profile=await loadLocalLibrary('lib/profile.ts');
import {TableActionCoordinator,TableRequestError} from '../lib/table-client.ts';
let cursor=0,slots=[];const copied=[],sent=[],effects=[];let transport=async(url,init)=>{if(init?.body)sent.push(JSON.parse(init.body));return room};
const room={code:'ABCD',me:0,isHost:true,round:0,phase:'lobby',options:[],waits:[],players:[0,1,2,3].map(i=>({name:'牌友'+i,bot:i>0,score:0,ready:true,count:0,melds:[],river:[]})),messages:[],interactions:[],logs:[],version:2};
const hooks={useState(value){const i=cursor++;if(!(i in slots))slots[i]=i===0&&value===null?room:value;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useCallback(fn){cursor++;return fn},useEffect(fn){effects.push(fn);cursor++}};
function stub(tag){return ({children,...props})=>React.createElement(tag,props,children)}
function ChatPanel(){return React.createElement('div',{className:'chat-controls'},'互动')}
const context=vm.createContext({Date,URL,crypto,AbortController,location:{origin:'https://example.test'},navigator:{clipboard:{writeText:async text=>copied.push(text)}},history:{replaceState:()=>{}},setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}}});
const imports={'@/lib/training':training,'@/lib/profile':profile,'./game-progress':{AvatarPicker:()=>null,NextRound:()=>null,HistoryPanel:()=>null,RecoveryBanner:()=>null,TutorialPanel:()=>null},'react':hooks,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/interaction':interactions,'@/lib/table-client':{TableActionCoordinator,TableRequestError,tableRequest:(...args)=>transport(...args),TablePoller:class{constructor(read,apply){this.read=read;this.apply=apply}async poll(){this.apply(await this.read(new AbortController().signal))}stop(){}}},'./game-audio':{SoundToggle:()=>null,useTableSound:()=>({enabled:false,toggle:async()=>{}})},'./game-interactions':{InteractionLayer:()=>null},'./game-actions':{TableActions:()=>null},'./game-social':{ChatPanel,ChatBubble:()=>null,RoundEnd:()=>null,ScoreOverview:()=>null,SettlementDetails:()=>null},'@/components/ui/button':{Button:stub('button')},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null])),'@/components/ui/tabs':Object.fromEntries(['Tabs','TabsContent','TabsList','TabsTrigger'].map(n=>[n,stub('div')])),'@/components/ui/switch':{Switch:stub('input')}};
const modules={};for(const [name,obj]of Object.entries(imports))modules[name]=new vm.SyntheticModule(Object.keys(obj),function(){for(const key of Object.keys(obj))this.setExport(key,obj[key])},{context});
const code=ts.transpileModule(fs.readFileSync('app/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(code,{context});await m.link(name=>modules[name]);await m.evaluate();
function render(props){cursor=0;return m.namespace.default(props)}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);let result=[tree];if(typeof tree.type==='function'&&tree.type.name==='Seat')result.push(...nodes(tree.type(tree.props)));else result.push(...nodes(tree.props?.children));return result}
let tree=render(),all=nodes(tree),html=renderToStaticMarkup(tree);
assert.match(html,/table-center waiting"><span class="table-seal">贵阳<br\/>捉鸡<\/span><\/div>/);assert.doesNotMatch(html,/好牌，值得一起等/);
const self=all.find(n=>n.props?.className==='self-seat');assert(nodes(self).some(n=>n.type===ChatPanel));const hand=all.find(n=>n.props?.className==='hand-area');assert(!nodes(hand).some(n=>n.type===ChatPanel));
await all.find(n=>n.props?.['aria-label']==='复制邀请码').props.onClick();assert.deepEqual(copied,['ABCD']);await all.find(n=>n.props?.children==='复制邀请链接').props.onClick();assert.equal(copied[1],'https://example.test/?room=ABCD');
const panel=all.find(n=>n.type===ChatPanel);panel.props.onPick('tomato');tree=render();all=nodes(tree);const avatars=all.filter(n=>n.type==='button'&&n.props?.['data-avatar-seat']!==undefined);assert.equal(avatars.length,3);assert(avatars.every(n=>!n.props.disabled));assert.match(renderToStaticMarkup(tree),/点对方头像/);
await avatars.find(n=>n.props['data-avatar-seat']===1).props.onClick();assert.equal(sent[0].action,'interaction');assert.equal(sent[0].effect,'tomato');assert.equal(sent[0].target,1);assert.equal(sent[0].code,'ABCD');assert(sent[0].clientId);
// Exercise the actual action callback's immediate stale-state recovery.
const nextRoom={...room,version:5,revision:5,actionContext:'fresh',players:room.players.map(p=>({...p}))};
transport=async(url,init)=>{sent.push(JSON.parse(init.body));throw new TableRequestError('updated',409,{code:'STATE_CHANGED',state:nextRoom})};
all=nodes(render());all.find(n=>n.props?.onAction&&n.props?.options).props.onAction('ready');await new Promise(setImmediate);
assert.equal(slots[0].version,5);assert.equal(slots[4],'','ordinary stale race does not leave a red error');assert.match(slots[5],/牌桌已更新/);assert(sent.at(-1).clientId);
// A timeout keeps buttons locked until the next successful receipt snapshot.
let lostBody;transport=async(url,init)=>{lostBody=JSON.parse(init.body);throw new Error('lost response')};
all=nodes(render());all.find(n=>n.props?.onAction&&n.props?.options).props.onAction('ready');await new Promise(setImmediate);
assert.equal(slots[3],true);assert.match(slots[4],/正在确认/);assert.match(renderToStaticMarkup(render()),/正在确认操作/);
transport=async()=>({...nextRoom,version:6,revision:6,actionAck:{clientId:lostBody.clientId,status:'applied'}});
const pollEffect=effects.find(fn=>fn.toString().includes('new TablePoller'));const stopPoll=pollEffect();await new Promise(setImmediate);stopPoll();
assert.equal(slots[0].version,6);assert.equal(slots[3],false);assert.equal(slots[4],'','confirmed network recovery clears the obsolete error');
// A delayed heartbeat snapshot cannot overwrite a more recent stored revision.
const update=nodes(render()).find(n=>n.type===ChatPanel).props.onUpdate;update({...nextRoom,version:6,revision:5});assert.equal(slots[0].revision,6);
console.log('PASS: v12 actual page callback immediately applies stale snapshot, locks uncertain actions, clears recovered errors and ignores late revisions.');
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

// A refresh that initially cannot reach the server must retry without trapping
// the user at a disabled lobby. The original room/guest are retained.
slots=[];slots[0]=null;effects.length=0;context.location.href='https://example.test/?room=ABCD';context.setTimeout=fn=>setTimeout(fn,0);
let boots=0;transport=async url=>{if(!url.includes('?room=')){if(++boots===1)throw new Error('initially offline');return {session:true}}return nextRoom};
render();const bootstrap=effects.find(fn=>fn.toString().includes('searchParams.get'));const stopBootstrap=bootstrap();
await new Promise(resolve=>setTimeout(resolve,20));assert.equal(boots,2);assert.equal(slots[0].code,'ABCD');assert.equal(slots[4],'');assert.equal(slots[3],false);stopBootstrap();
console.log('PASS: v12 initial refresh retries a failed session bootstrap and restores the original room.');

// The real Home learning branch never initializes a session or table transport.
slots=[];slots[0]=null;effects.length=0;let onlineCalls=0;transport=async()=>{onlineCalls++;throw new Error('learning must remain local')};
render({training:true});const localInit=effects.find(fn=>fn.toString().includes('searchParams.get'));localInit();assert.equal(onlineCalls,0);assert.equal(slots[0].local,true);
let localTree=render({training:true}),localNodes=nodes(localTree);assert(!localNodes.some(n=>n.props?.['aria-label']==='复制邀请码'));assert(!localNodes.some(n=>n.type===ChatPanel));
let lessonPanel=localNodes.find(n=>n.props?.onNext&&n.props?.onTour);assert(lessonPanel);for(let i=0;i<training.LESSON_STEPS.length;i++){lessonPanel.props.onNext();localTree=render({training:true});lessonPanel=nodes(localTree).find(n=>n.props?.onNext&&n.props?.onTour)}
assert(slots[0].options.includes('discard'));const tile=slots[0].suggestion;localNodes=nodes(localTree);const handTile=localNodes.find(n=>n.props?.onClick&&n.props?.t===tile&&n.props?.group);assert(handTile);assert.equal(handTile.props.disabled,false);handTile.props.onClick();localTree=render({training:true});localNodes=nodes(localTree);const discard=localNodes.find(n=>n.props?.className==='primary-button discard');assert.equal(discard.props.disabled,false);discard.props.onClick();await new Promise(setImmediate);assert.equal(slots[0].lesson.gate,true);assert.equal(onlineCalls,0);
console.log('PASS: v13 actual beginner page opens and plays with zero online requests, no room sharing/chat, explicit intro progression and post-action teaching pause.');
