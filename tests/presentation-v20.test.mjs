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
const hooks={useState(value){const i=cursor++;if(!(i in slots))slots[i]=i===0&&value===null?room:value;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useCallback(fn){cursor++;return fn},useEffect(fn){effects.push(fn);cursor++}};
function stub(tag){return ({children,...props})=>React.createElement(tag,props,children)}
function ChatPanel(){return React.createElement('div',{className:'chat-controls'},'互动')}
const context=vm.createContext({Date,URL,crypto,AbortController,location:{origin:'https://example.test',href:'https://example.test/'},navigator:{clipboard:{writeText:async text=>copied.push(text)}},history:{replaceState:()=>{}},setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}}});
function RulesPublicPanel(){return null}function RuleTables(){return null}
const selection=await loadLocalLibrary('lib/selection.ts');
const imports={'@/lib/selection':selection,'./game-coach':{TableCoach:()=>null},'./game-host':{HostControls:()=>null},'./game-versions':{VersionHistory:()=>null},'./game-entry':{GameEntry:()=>null},'./game-rules':{RulesPublicPanel,RuleTables},'@/lib/solo':solo,'@/lib/table-events':tableEvents,'./game-experience':{useImmersive:()=>({immersive:false,toggle:async()=>{}}),useRoundPresentation:()=> 'summary',TableEventNotice:()=>null,SoloPanel:()=>null},'@/lib/training':training,'@/lib/profile':profile,'./game-progress':{AvatarPicker:()=>null,NextRound:()=>null,HistoryPanel:()=>null,RecoveryBanner:()=>null,TutorialPanel:()=>null},'react':hooks,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game':game,'@/lib/interaction':interactions,'@/lib/table-client':{TableActionCoordinator,TableRequestError,tableRequest:(...args)=>transport(...args),TablePoller:class{constructor(read,apply){this.read=read;this.apply=apply}async poll(){this.apply(await this.read(new AbortController().signal))}stop(){}}},'./game-audio':{SoundToggle:()=>null,useTableSound:()=>({enabled:false,toggle:async()=>{}})},'./game-interactions':{InteractionLayer:()=>null},'./game-actions':{TableActions:()=>null},'./game-social':{ChatPanel,ChatBubble:()=>null,RoundEnd:()=>null,ScoreOverview:()=>null,SettlementDetails:()=>null},'@/components/ui/button':{Button:stub('button')},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null])),'@/components/ui/tabs':Object.fromEntries(['Tabs','TabsContent','TabsList','TabsTrigger'].map(n=>[n,stub('div')])),'@/components/ui/switch':{Switch:stub('input')}};
const modules={};for(const [name,obj]of Object.entries(imports))modules[name]=new vm.SyntheticModule(Object.keys(obj),function(){for(const key of Object.keys(obj))this.setExport(key,obj[key])},{context});
const code=ts.transpileModule(fs.readFileSync('app/page.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(code,{context});await m.link(name=>modules[name]);await m.evaluate();
function render(props){cursor=0;return m.namespace.default(props)}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);let result=[tree];if(typeof tree.type==='function'&&tree.type.name==='Seat')result.push(...nodes(tree.type(tree.props)));else result.push(...nodes(tree.props?.children));return result}

const played={...room,round:1,phase:'play',turn:0,drawnIndex:13,remaining:30,deadline:Date.now()+45000,players:room.players.map(p=>({...p,hand:Array.from({length:14},(_,i)=>i),count:14,charges:[]}))};
slots[0]=played;
let tree=render(),all=nodes(tree),seats=all.filter(n=>typeof n.type==='function'&&n.type.name==='Seat');assert.equal(seats.length,3);
const originalTypes=seats.map(n=>n.type);
// Actual React element identities must stay the same across clock updates and snapshots.
for(let i=0;i<30;i++){slots[10]=Date.now()+i*500;slots[0]={...played,revision:i,players:played.players.map(p=>({...p}))};const next=nodes(render()).filter(n=>typeof n.type==='function'&&n.type.name==='Seat');assert(next.every((n,j)=>n.type===originalTypes[j]));assert(next.every(n=>n.props.now===slots[10]));}
let hand=nodes(render()).find(n=>n.props?.className==='hand-tiles');assert.equal(hand.props.style['--hand-slots'],14);assert.equal(nodes(hand).filter(n=>n.props?.t!==undefined).length,14);assert.equal(nodes(hand).filter(n=>n.props?.newDrawn).length,1);
const dotTile=nodes(hand).find(n=>n.props?.newDrawn);dotTile.props.onClick();assert.match(renderToStaticMarkup(render()),/aria-label="5筒 · 新摸的牌"[^>]*aria-pressed="true"/);
// Constrain valid 13/14-hand configurations, including up to four exposed kongs.
let cases=0;
for(const baseCount of [13,14])for(let meldCount=0;meldCount<=4;meldCount++)for(let kongCount=0;kongCount<=meldCount;kongCount++){
 const melds=Array.from({length:meldCount},(_,i)=>({t:i,k:i<kongCount?'gang':'peng',hidden:i<kongCount,from:1})),handCount=baseCount-meldCount*3;
 slots[0]={...played,drawnIndex:handCount-1,players:played.players.map((p,i)=>i===0?{...p,hand:Array.from({length:handCount},(_,j)=>j),melds}:p)};
 hand=nodes(render()).find(n=>n.props?.className==='hand-tiles');
 const style=hand.props.style,space=parseFloat(style['--hand-space']),units=Number(style['--hand-slots']);
 const meldTiles=melds.reduce((n,m)=>n+(m.k==='gang'?4:3),0),expectedSpace=Math.max(0,handCount+meldCount-1)*2+meldCount*6+meldTiles-meldCount;
 assert.equal(space,expectedSpace);assert(Math.abs(units-(handCount+meldTiles*.72))<.00001);
 for(const viewport of [320,360,375,390,414,430,768]){
  // Ordinary portrait: page 16 + shell 8/border 2 + hand 12 + rail 6.
  const rail=viewport-44,width=Math.min(40,(rail-space)/units),used=handCount*width+meldTiles*width*.72+space;
  assert(width>0);assert(used<=rail+.001,`all tiles fit at ${viewport}px with ${meldCount} melds/${kongCount} kongs`);cases++;
 }
}
// Opponent public melds stay public; concealed kongs retain only backs.
const opponent={...played.players[2],melds:[{t:0,k:'peng',from:1},{t:-1,k:'gang',hidden:true}],hand:[],count:7};slots[0]={...played,players:played.players.map((p,i)=>i===2?opponent:p)};
let html=renderToStaticMarkup(render());assert.match(html,/牌友2碰杠的牌/);assert.match(html,/碰 · 来自牌友1/);assert.equal((html.match(/title="牌背"/g)||[]).length,4);
// Reveal the rotated top river using visual geometry, without scrolling the hand.
slots[0]={...played,lastDiscard:{seq:50}};effects.length=0;tree=render();let felt=nodes(tree).find(n=>n.props?.className?.includes?.('felt')&&n.props?.ref);
const latest={offsetHeight:26,getBoundingClientRect:()=>({top:410})};felt.props.ref.current={scrollTop:0,scrollHeight:600,clientHeight:200,getBoundingClientRect:()=>({top:10}),querySelector:s=>s==='.latest-discard'?latest:null};
const riverEffect=effects.find(fn=>fn.toString().includes('bottom + 5'));assert(riverEffect);riverEffect();assert.equal(felt.props.ref.current.scrollTop,231);
felt.props.ref.current.scrollTop=10;felt.props.ref.current.querySelector=()=>latest;riverEffect();assert.equal(felt.props.ref.current.scrollTop,10,'do not scroll away from a pending central call');
console.log(`PASS: stable opponent component types across clock/poll updates; 14 drawn tiles/red dot/selection, ${cases} portrait width cases including kongs, concealed backs/public sources and visual river scrolling with call priority.`);

// Preselect on another seat's turn; draw sorting must retain the same tile.
slots[0]={...played,turn:1,drawnIndex:null,players:played.players.map((p,i)=>i===0?{...p,hand:Array.from({length:13},(_,j)=>j+1)}:p)};slots[3]=false;
let offHand=nodes(render()).find(n=>n.props?.className==='hand-tiles');const candidate=nodes(offHand).find(n=>n.props?.t===6);assert.equal(candidate.props.disabled,false);candidate.props.onClick();
assert.match(renderToStaticMarkup(render()),/已预选 7万/);assert(!nodes(render()).some(n=>n.props?.className==='primary-button discard'));
slots[0]={...slots[0],turn:0,drawnIndex:0,players:slots[0].players.map((p,i)=>i===0?{...p,hand:[0,...p.hand]}:p)};
assert.equal(nodes(render()).find(n=>n.props?.selected&&n.props?.t!==undefined).props.t,6);
slots[0]={...slots[0],players:slots[0].players.map((p,i)=>i===0?{...p,hand:p.hand.filter(t=>t!==6)}:p)};assert(!nodes(render()).some(n=>n.props?.selected&&n.props?.t!==undefined));
assert.equal((renderToStaticMarkup(render()).match(/Created by Ashaini白告然/g)||[]).length,2);
console.log('PASS: actual Home preselection while another seat plays, no discard control before your turn, same tile after draw sorting, absent tile cleared and both exact author credits.');

// v28 credit belongs to the hand rail, and face-up an stays named an.
let actualTree=render(),handArea=nodes(actualTree).find(n=>n.props?.className==='hand-area');assert.equal(nodes(handArea).filter(n=>n.props?.className==='table-signature').length,1);
slots[0]={...played,players:played.players.map((p,i)=>i===2?{...p,hand:[],melds:[{t:1,k:'gang',hidden:true,faceUp:true,kong:'an'}]}:p)};html=renderToStaticMarkup(render());assert.match(html,/aria-label="暗杠 2万"/);assert(!html.includes('title="牌背"'));assert.match(html,/tiles\/1.webp/);console.log('PASS: v28 actual hand-area credit and public four-face an with unchanged an label.');
