import {loader} from './account-v32-loader.mjs';
const avatarModule=await loader()('app/game-avatar.tsx'),tileModule=await loader()('app/game-tiles.tsx');
let accountFixture={user:null,ready:true,saveRules:async()=>{},error:'',refresh:async()=>null};
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
const training=await loadLocalLibrary('lib/training.ts'),profile=await loadLocalLibrary('lib/profile.ts'),solo=await loadLocalLibrary('lib/solo.ts'),tableEvents=await loadLocalLibrary('lib/table-events.ts');
import {TableActionCoordinator,TableRequestError} from '../lib/table-client.ts';
let cursor=0,slots=[];const copied=[],sent=[],effects=[];let transport=async(url,init)=>{if(init?.body)sent.push(JSON.parse(init.body));return room};
const room={code:'ABCD',me:0,isHost:true,round:0,phase:'lobby',options:[],waits:[],players:[0,1,2,3].map(i=>({name:'牌友'+i,bot:i>0,score:0,ready:true,count:0,melds:[],river:[]})),messages:[],interactions:[],logs:[],version:2};
const hooks={useState(value){const i=cursor++;if(!(i in slots))slots[i]=i===0&&value===null?room:value;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){if(v===accountFixture)return {current:v};const i=cursor++;return slots[i]??(slots[i]={current:v})},useCallback(fn){cursor++;return fn},useEffect(fn){effects.push(fn);cursor++}};
function stub(tag){return ({children,...props})=>React.createElement(tag,props,children)}
function ChatPanel(){return React.createElement('div',{className:'chat-controls'},'互动')}
const context=vm.createContext({Date,URL,crypto,AbortController,location:{origin:'https://example.test'},navigator:{clipboard:{writeText:async text=>copied.push(text)}},history:{replaceState:()=>{}},setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}}});
function RulesPublicPanel(){return null}function RuleTables(){return null}
const selection=await loadLocalLibrary('lib/selection.ts');
const ledgerModule=await loader()('lib/settlement-ledger.ts');
const imports={'@/lib/settlement-ledger':ledgerModule,'./game-tiles':tileModule,'./game-avatar':avatarModule,'./account-context':{useAccount:()=>accountFixture,accountRequest:async()=>({saved:true})},'./account-control':{AccountControl:()=>null,openAccount:()=>{}},'@/lib/account-outbox':{queueLocalRound:async()=>{},pendingLocalRounds:async()=>[],completeLocalRound:async()=>{}},'@/lib/selection':selection,'./game-coach':{TableCoach:()=>null},'./game-host':{HostControls:()=>null},'./game-versions':{VersionHistory:()=>null},'./game-entry':{GameEntry:()=>null},'./game-rules':{RulesPublicPanel,RuleTables},'@/lib/solo':solo,'@/lib/table-events':tableEvents,'./game-experience':{useImmersive:()=>({immersive:false,toggle:async()=>{}}),useRoundPresentation:()=> 'summary',TableEventNotice:()=>null,SoloPanel:()=>null},'@/lib/training':training,'@/lib/profile':profile,'./game-progress':{AvatarPicker:()=>null,NextRound:()=>null,HistoryPanel:()=>null,RecoveryBanner:()=>null,TutorialPanel:()=>null},'react':hooks,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/interaction':interactions,'@/lib/table-client':{TableActionCoordinator,TableRequestError,tableRequest:(...args)=>transport(...args),TablePoller:class{constructor(read,apply){this.read=read;this.apply=apply}async poll(){this.apply(await this.read(new AbortController().signal))}stop(){}}},'./game-audio':{SoundToggle:()=>null,useTableSound:()=>({enabled:false,toggle:async()=>{}})},'./game-interactions':{InteractionLayer:()=>null},'./game-actions':{TableActions:()=>null},'./game-social':{ChatPanel,ChatBubble:()=>null,RoundEnd:()=>null,ScoreOverview:()=>null,SettlementDetails:()=>null},'@/components/ui/button':{Button:stub('button')},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null])),'@/components/ui/tabs':Object.fromEntries(['Tabs','TabsContent','TabsList','TabsTrigger'].map(n=>[n,stub('div')])),'@/components/ui/switch':{Switch:stub('input')}};
const modules={};for(const [name,obj]of Object.entries(imports))modules[name]=new vm.SyntheticModule(Object.keys(obj),function(){for(const key of Object.keys(obj))this.setExport(key,obj[key])},{context});
const code=ts.transpileModule(fs.readFileSync('app/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(code,{context});await m.link(name=>modules[name]);await m.evaluate();
function render(props){cursor=0;return m.namespace.default(props)}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);let result=[tree];if(typeof tree.type==='function'&&tree.type.name==='Seat')result.push(...nodes(tree.type(tree.props)));else result.push(...nodes(tree.props?.children));return result}
let tree=render(),all=nodes(tree),html=renderToStaticMarkup(tree);
assert.match(html,/table-center waiting"><span class="table-seal">贵阳<br\/>捉鸡<\/span><\/div>/);assert.doesNotMatch(html,/好牌，值得一起等/);assert.doesNotMatch(html,/tip-card|新手陪打|看看这桌怎么玩/);
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
for(let step=0;step<40&&!slots[0].options.includes('discard');step++){if(slots[0].phase==='claim'&&slots[0].options.length){nodes(render({training:true})).find(n=>n.props?.onAction&&n.props?.options).props.onAction('pass');await new Promise(setImmediate)}else lessonPanel.props.onNext();localTree=render({training:true});lessonPanel=nodes(localTree).find(n=>n.props?.onNext&&n.props?.onTour)}
assert(slots[0].options.includes('discard'));const tile=slots[0].suggestion;localNodes=nodes(localTree);const handTile=localNodes.find(n=>n.props?.onClick&&n.props?.t===tile&&n.props?.group);assert(handTile);assert.equal(handTile.props.disabled,false);handTile.props.onClick();localTree=render({training:true});localNodes=nodes(localTree);const discard=localNodes.find(n=>n.props?.className==='primary-button discard');assert.equal(discard.props.disabled,false);discard.props.onClick();await new Promise(setImmediate);assert.equal(slots[0].lesson.gate,true);assert.equal(onlineCalls,0);
console.log('PASS: v13 actual beginner page opens and plays with zero online requests, no room sharing/chat, explicit intro progression and post-action teaching pause.');

// The new ordinary solo branch has no session bootstrap, polling, sharing or chat.
slots=[];slots[0]=null;effects.length=0;onlineCalls=0;render({solo:true});effects.find(fn=>fn.toString().includes('searchParams.get'))();
assert.equal(slots[0].solo,true);assert.equal(onlineCalls,0);
let soloNodes=nodes(render({solo:true}));assert(!soloNodes.some(n=>n.type===ChatPanel));assert(!soloNodes.some(n=>n.props?.['aria-label']==='复制邀请码'));
const soloControls=soloNodes.find(n=>n.props?.onAction&&n.props?.onRules);assert(soloControls);
assert.equal(slots[0].phase,'lobby');assert.equal(slots[0].round,0);assert(slots[0].players.every(p=>p.count===0));
const beginSolo=soloNodes.find(n=>n.props?.className==='primary-button solo-start-button');assert(beginSolo);beginSolo.props.onClick();await new Promise(setImmediate);assert.equal(slots[0].phase,'play');assert.equal(slots[0].round,1);
soloControls.props.onAction('pause');await new Promise(setImmediate);assert.equal(slots[0].paused,true);
assert.match(renderToStaticMarkup(render({solo:true})),/牌局已暂停/);soloNodes=nodes(render({solo:true}));assert(soloNodes.filter(n=>n.props?.onClick&&n.props?.t!==undefined).every(n=>n.props.disabled));
soloControls.props.onAction('continue');await new Promise(setImmediate);assert.equal(slots[0].paused,false);assert.equal(onlineCalls,0);
console.log('PASS: actual solo page runs without HTTP, pauses, locks hand and resumes locally.');
const singleGame=slots.find(s=>s?.current instanceof solo.SoloGame).current;
singleGame.lastActivityAt=Date.now()-60001;assert.equal(singleGame.tick(),true);soloControls.props.onAction('pause');await new Promise(setImmediate);
let idleTree=render({solo:true});assert.match(renderToStaticMarkup(idleTree),/60 秒无操作，已暂停/);assert.equal(slots[0].players[0].managed,false);
idleTree.props.onPointerDownCapture();assert.equal(singleGame.pausedAt!==null,true);
soloControls.props.onAction('continue');await new Promise(setImmediate);assert.equal(singleGame.pausedAt,null);
singleGame.lastActivityAt=Date.now()-59000;render({solo:true}).props.onKeyDownCapture();assert(singleGame.lastActivityAt>Date.now()-1000);assert.equal(slots[0].idleDeadline,singleGame.lastActivityAt+60000);assert.equal(onlineCalls,0);
console.log('PASS: actual Home idle-pause notice and manual lock, clicks never unpause, keyboard activity refreshes the idle clock and continue resumes without HTTP.');

// The real Home keeps wait hints after removal and gates avatar interactions.
slots=[];effects.length=0;
const ended={...room,round:1,phase:'done',turn:0,waits:[18,0],remaining:10,players:room.players.map(p=>({...p,hand:[18],count:1,charges:[]})),result:{winner:-1,burned:[false,false,false,false],delta:[0,0,0,0],beans:[0,0,0,0],hu:[0,0,0,0],chicken:[0,0,0,0],values:[0,0,0,0],flip:null,pattern:'流局',kind:'流局'}};
slots[0]=ended;tree=render();all=nodes(tree);html=renderToStaticMarkup(tree);assert.match(html,/听 1条、1万/);assert.doesNotMatch(html,/tip-card|新手陪打/);
assert.equal(all.find(n=>n.type===ChatPanel).props.blocked,true);
let endComponent=all.find(n=>n.props?.onOpenChange&&n.props?.Tile);assert(endComponent);endComponent.props.onOpenChange(false);all=nodes(render());assert.equal(all.find(n=>n.type===ChatPanel).props.blocked,false);
endComponent=all.find(n=>n.props?.onOpenChange&&n.props?.Tile);endComponent.props.onOpenChange(true);all=nodes(render());assert.equal(all.find(n=>n.type===ChatPanel).props.blocked,true);
slots[0]={...ended,round:2};all=nodes(render());assert.equal(all.find(n=>n.type===ChatPanel).props.blocked,true,'new round starts with its settlement overlay open');
console.log('PASS: actual Home removed hint card, retained wait tiles, and synchronizes interaction availability with settlement collapse/reopen and new rounds.');

// Records and the rule reference are below the table, never in the side panel.
all=nodes(render());const below=all.find(n=>n.props?.className==='table-below'),side=all.find(n=>n.props?.className==='side-panel');assert(below);assert(nodes(below).some(n=>n.type===RulesPublicPanel));assert(!nodes(side).some(n=>n.type===RulesPublicPanel));assert(!nodes(side).some(n=>n.props?.className==='result-card'));assert(!nodes(side).some(n=>n.props?.room&&n.type?.name==='HistoryPanel'));
let publicRules=nodes(below).find(n=>n.type===RulesPublicPanel),savedRules=game.defaultRules();savedRules.chickenTiles=[16,18];transport=async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.action,'rules');assert.deepEqual(body.rules,savedRules);return {...ended,rules:savedRules,ruleRevision:2,version:8,revision:8}};
accountFixture.user={id:'test-account'};await publicRules.props.onSave(savedRules);accountFixture.user=null;assert.deepEqual(slots[0].rules,savedRules);console.log('PASS: actual Home places history and rules below table, removes side settlement, and submits full rules through the confirmed action coordinator.');

// A cramped table scrolls its calls into view without moving the page or hand.
slots=[];effects.length=0;slots[0]={...ended,phase:'claim',actionContext:'claim19'};
let callTree=render(),felt=nodes(callTree).find(n=>n.props?.className?.includes?.('felt')&&n.props?.ref);
const action={offsetHeight:70,getBoundingClientRect:()=>({top:310})};
felt.props.ref.current={scrollTop:0,scrollHeight:600,clientHeight:200,getBoundingClientRect:()=>({top:10}),querySelector:()=>action};
const callEffect=effects.find(fn=>fn.toString().includes('bottom + 8'));assert(callEffect);callEffect();assert.equal(felt.props.ref.current.scrollTop,178);
slots[0]={...ended};effects.length=0;render();effects.find(fn=>fn.toString().includes('bottom + 8'))();assert.equal(felt.props.ref.current.scrollTop,0);
assert.match(renderToStaticMarkup(render()),/has-hand-app/);
console.log('PASS: actual Home keeps mobile hand layout active and scrolls only the felt for legal calls; settlement resets that scroll.');

// The entry saves current identity before local navigation, then the actual
// local bootstrap uses that identity and selected pace without table HTTP.
slots=[];slots[0]=null;effects.length=0;
const profileValues=new Map();context.localStorage={getItem:k=>profileValues.get(k)??null,setItem:(k,v)=>profileValues.set(k,v)};
profile.saveProfile(context.localStorage,'入口牌友','🐔');context.location.href='https://example.test/';
render();effects.find(fn=>fn.toString().includes('readProfile(localStorage)'))();
let entrance=nodes(render()).find(n=>n.type?.name==='GameEntry');assert(entrance);assert.equal(entrance.props.name,'入口牌友');assert.equal(entrance.props.avatar,'🐔');entrance.props.onName('新昵称');entrance=nodes(render()).find(n=>n.type?.name==='GameEntry');entrance.props.onLocal('solo',true);assert.equal(context.location.href,'/solo?fast=1');assert.equal(profile.readProfile(context.localStorage).name,'新昵称');
context.location.href='https://example.test/solo?fast=1';slots=[];slots[0]=null;effects.length=0;onlineCalls=0;render({solo:true});effects.find(fn=>fn.toString().includes('searchParams.get'))();assert.equal(slots[0].fast,true);assert.equal(slots[0].players[0].name,'新昵称');assert.equal(slots[0].players[0].avatar,'🐔');assert.equal(onlineCalls,0);
console.log('PASS: actual Home restores entry identity, persists edits before navigation and starts fast solo with that profile and zero network calls.');

slots=[];slots[0]=null;effects.length=0;context.location.href='https://example.test/?room=ABCD';transport=async url=>{if(!url.includes('?room='))return {session:true};throw new TableRequestError('请先输入昵称加入房间',403,{})};render();const invitedStop=effects.find(fn=>fn.toString().includes('searchParams.get'))();await new Promise(resolve=>setTimeout(resolve,20));entrance=nodes(render()).find(n=>n.type?.name==='GameEntry');assert.equal(entrance.props.code,'ABCD');assert.equal(entrance.props.tab,'join');assert.equal(slots[4],'','a new invited player is offered joining without a spurious error');invitedStop();
console.log('PASS: actual Home invitation preselects joining and preserves its code without showing an error for a legitimate new guest.');

// Real page management callback preserves the confirmation version/round,
// and a kicked poll leaves cleanly even when another action was uncertain.
slots=[];slots[0]={...room,round:2,version:9};effects.length=0;transport=async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.action,'kick');assert.equal(body.tile,1);assert.equal(body.version,7);assert.equal(body.round,2);return {...room,version:10,round:2}};
let manager=nodes(render()).find(n=>n.type===imports['./game-host'].HostControls);assert(manager);await manager.props.onAction('kick',1,{version:7,round:2});assert.equal(slots[0].version,10);
transport=async()=>{throw new Error('lost response')};manager=nodes(render()).find(n=>n.type===imports['./game-host'].HostControls);await assert.rejects(manager.props.onAction('kick',1,{version:10,round:2}));assert.equal(slots[3],true);assert(slots[4]);
effects.length=0;render();transport=async()=>({left:true,kicked:true,message:'你已被房主移出房间'});const stopKickedPoll=effects.find(fn=>fn.toString().includes('new TablePoller'))();await new Promise(setImmediate);stopKickedPoll();assert.equal(slots[0],null);assert.equal(slots[3],false);assert.equal(slots[4],'');assert.equal(slots[5],'你已被房主移出房间');assert.equal(slots[1],'');
console.log('PASS: actual Home captures management target version/round and clears the room, pending action, error and invite code with a clear kicked notice.');
// v34 real Home logout coordination and guest page lifetime.
const pageStorage=new Map();context.sessionStorage={getItem:k=>pageStorage.get(k)??null,setItem:(k,v)=>pageStorage.set(k,v),removeItem:k=>pageStorage.delete(k)};
accountFixture.accept=u=>{accountFixture.user=u};accountFixture.user={id:'logout-owner',nickname:'退出测试',avatar:'🐼',rules:game.defaultRules()};
slots=[];slots[0]={...room,phase:'play',turn:0,drawn:0,remaining:50,players:room.players.map(p=>({...p,hand:[0],charges:[]}))};effects.length=0;let logoutPosts=0;transport=async()=>{logoutPosts++;return {left:true}};
let accountButton=nodes(render()).find(n=>n.props?.onLogout);await assert.rejects(accountButton.props.onLogout(),/进行中/);assert.equal(logoutPosts,0);assert.equal(accountFixture.user.id,'logout-owner');
slots[0]={...room,phase:'lobby'};accountButton=nodes(render()).find(n=>n.props?.onLogout);await accountButton.props.onLogout();assert.equal(logoutPosts,1);assert.equal(accountFixture.user,null);assert.equal(slots[0],null);
accountFixture.user={id:'logout-owner',nickname:'退出测试',avatar:'🐼',rules:game.defaultRules()};slots=[];slots[0]=null;effects.length=0;context.location.href='https://example.test/solo';render({solo:true});effects.find(fn=>fn.toString().includes('selectedFast'))();let ownerGame=slots.find(v=>v?.current instanceof solo.SoloGame).current;ownerGame.human('start');ownerGame.human('recordReplay',1);pageStorage.set('mahjong-solo',ownerGame.serialize());accountButton=nodes(render({solo:true})).find(n=>n.props?.onLogout);await accountButton.props.onLogout();assert.equal(ownerGame.room.accountOwner,undefined);assert.equal(ownerGame.room.nextReplayEnabled,false);assert.equal(pageStorage.has('mahjong-solo'),false);assert.equal(accountFixture.user,null);
effects.length=0;render({solo:true});effects.find(fn=>fn.toString().includes('selectedFast'))();assert.equal(slots.find(v=>v?.current instanceof solo.SoloGame).current,ownerGame,'logout keeps the current round as a paused guest game');
const legacyGuest=ownerGame.serialize();slots=[];slots[0]=null;effects.length=0;pageStorage.set('mahjong-solo',legacyGuest);render({solo:true});effects.find(fn=>fn.toString().includes('selectedFast'))();assert.equal(slots[0].history.length,0);assert.equal(slots[0].replayEnabled,false);assert.equal(pageStorage.has('mahjong-solo'),false,'reopened guest page never restores stored guest history');
console.log('PASS v34: actual Home blocks active multi logout with feedback, leaves lobby before identity switch, solo logout detaches recording and resumes as guest, and a reopened guest page starts with empty history.');

// v35 actual hand click callbacks: a second click discards only on a legal turn.
for(const mode of [{},{solo:true},{training:true}]){
 slots=[];effects.length=0;accountFixture.user=null;let moves=[];
 if(mode.solo||mode.training){slots[0]=null;render(mode);effects.find(fn=>fn.toString().includes('selectedFast'))();if(mode.solo)nodes(render(mode)).find(n=>n.props?.className==='primary-button solo-start-button').props.onClick()}
 const holder=slots.find(v=>v?.current instanceof (mode.solo?solo.SoloGame:training.TrainingGame));
 let current;
 if(mode.solo||mode.training){const localGame=holder.current;if(mode.training){localGame.intro=training.LESSON_STEPS.length;localGame.gate=false}localGame.room.turn=0;localGame.room.phase='play';localGame.room.claim=null;localGame.room.players[0].hand=[0,0,1,2,3,4,5,9,10,11,18,19,20,8];localGame.room.drawn=8;localGame.room.canKong=true;const originalHuman=localGame.human.bind(localGame);localGame.human=(...args)=>{moves.push(args);return originalHuman(...args)};slots[0]=localGame.snapshot()}
 else{slots[0]={...room,round:1,phase:'play',turn:0,options:['discard'],drawnIndex:13,remaining:50,actionContext:'tap',players:room.players.map(p=>({...p,hand:[0,0,1,2,3,4,5,9,10,11,18,19,20,8],charges:[]}))};transport=async(url,init)=>{const body=JSON.parse(init.body);moves.push(body);return {...slots[0],phase:'claim',version:3,revision:3,options:[]}}}
 const tileAt=index=>nodes(render(mode)).find(n=>n.props?.handIndex===index&&n.props.onClick);
 tileAt(0).props.onClick();assert.equal(moves.length,0);assert.equal(tileAt(0).props.selected,true);
 tileAt(1).props.onClick();assert.equal(moves.length,0,'another physical copy only changes selection');assert.equal(tileAt(1).props.selected,true);
 // Deliberately use a later event, no double-click timer requirement.
 tileAt(1).props.onClick();await new Promise(setImmediate);assert.equal(moves.length,1);assert.equal(mode.solo||mode.training?moves[0][0]:moves[0].action,'discard');
}
// Multiplayer preselection, paused/managed/pending states and the hint never discard.
slots=[];effects.length=0;let tapMoves=[];slots[0]={...room,round:1,phase:'play',turn:1,options:[],remaining:50,players:room.players.map(p=>({...p,hand:[0,1,2],charges:[]})),suggestion:1};transport=async(url,init)=>{tapMoves.push(JSON.parse(init.body));return {...slots[0],phase:'claim',version:3,revision:3,options:[]}};
const tapAt=i=>nodes(render()).find(n=>n.props?.handIndex===i&&n.props.onClick);tapAt(1).props.onClick();tapAt(1).props.onClick();assert.equal(tapMoves.length,0);
slots[0]={...slots[0],turn:0,options:['discard']};let hint=nodes(render()).find(n=>n.props?.className==='hint-button');hint.props.onClick();assert.equal(tapMoves.length,0);
slots[0]={...slots[0],paused:true};tapAt(1).props.onClick();assert.equal(tapMoves.length,0);slots[0]={...slots[0],paused:false};
tapAt(1).props.onClick();await new Promise(setImmediate);assert.equal(tapMoves.length,1,'preselected tile can be confirmed when the turn arrives');
console.log('PASS v35: actual solo waits for start, actual multi/solo/tutorial hand click callbacks select then discard, distinct duplicates, out-of-turn preselection, paused guards and hint-only selection.');
