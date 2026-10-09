import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import * as game from '../lib/game.ts';
import * as interaction from '../lib/interaction.ts';
import * as client from '../lib/table-client.ts';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadLocalLibrary} from './modules-v13.mjs';
const events=await loadLocalLibrary('lib/table-events.ts');
let cursor=0,slots=[],effectSlots=[],pending=[],timers=new Map(),timerSeq=0;
const listeners=new Map(),docListeners=new Map();let exits=0,requests=0,reject=true;
const document={hidden:false,body:{style:{overflow:'scroll'}},fullscreenElement:null,documentElement:{async requestFullscreen(){requests++;if(reject)throw new Error('unsupported');document.fullscreenElement=document.documentElement}},async exitFullscreen(){exits++;document.fullscreenElement=null;docListeners.get('fullscreenchange')?.()},addEventListener:(n,fn)=>docListeners.set(n,fn),removeEventListener:n=>docListeners.delete(n)};
const window={addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)};
const hooks={useState(v){const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],next=>slots[i]=typeof next==='function'?next(slots[i]):next]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn,deps){const i=cursor++,old=effectSlots[i];if(!old||!deps||deps.some((d,n)=>d!==old.deps[n])){pending.push(()=>{old?.cleanup?.();effectSlots[i]={deps,cleanup:fn()}})}}};
const context=vm.createContext({Date,document,window,setTimeout:(fn,delay)=>{const id=++timerSeq;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id)});
function mod(obj){return new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])},{context})}
const imports={'react':mod(hooks),'react/jsx-runtime':mod(jsx),'@/lib/table-events':mod(events),'@/components/ui/button':mod({Button:({children,...props})=>React.createElement('button',props,children)}),'@/components/ui/switch':mod({Switch:()=>null})};
async function load(path,map=imports){const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;const m=new vm.SourceTextModule(code,{context});await m.link(n=>map[n]);await m.evaluate();return m.namespace}
const experience=await load('app/game-experience.tsx');
function render(fn){cursor=0;const result=fn();const effects=pending;pending=[];effects.forEach(f=>f());return result}
function reset(){effectSlots.forEach(e=>e?.cleanup?.());slots=[];effectSlots=[];pending=[];timers.clear()}
let full=render(experience.useImmersive);assert.equal(full.immersive,false);await full.toggle();full=render(experience.useImmersive);assert.equal(full.immersive,true);assert.equal(document.body.style.overflow,'hidden');assert.equal(requests,1,'unsupported native fullscreen falls back to immersive page');listeners.get('keydown')({key:'Escape'});full=render(experience.useImmersive);assert.equal(full.immersive,false);assert.equal(document.body.style.overflow,'scroll');
reject=false;await full.toggle();full=render(experience.useImmersive);assert.equal(full.immersive,true);assert.equal(document.fullscreenElement,document.documentElement);await full.toggle();full=render(experience.useImmersive);assert.equal(full.immersive,false);assert.equal(exits,1);await full.toggle();full=render(experience.useImmersive);document.fullscreenElement=null;docListeners.get('fullscreenchange')();full=render(experience.useImmersive);assert.equal(full.immersive,false,'native escape updates toggle');reset();
const room={code:'ABCD',round:1,me:0,phase:'done',players:['甲','乙','丙','丁'].map(name=>({name,melds:[]})),result:{winner:0,from:1,kind:'接炮',pattern:'大对子',flip:8,rooster:0,delta:[12,-12,0,0],hu:[8,-8,0,0],beans:[0,0,0,0],chicken:[4,-4,0,0],values:[0,0,0,0]}};
assert.equal(render(()=>experience.useRoundPresentation(room)),'winner');timers.values().find(t=>t.delay===1600).fn();assert.equal(render(()=>experience.useRoundPresentation(room)),'flip');timers.values().find(t=>t.delay===4200).fn();assert.equal(render(()=>experience.useRoundPresentation(room)),'summary');reset();
const social=await load('app/game-social.tsx',{'react':mod(React),'react/jsx-runtime':mod(jsx),'lucide-react':mod(icons),'@/lib/game':mod(game),'@/lib/table-events':mod(events),'@/lib/interaction':mod(interaction),'@/lib/table-client':mod(client)});
const Tile=({t})=>React.createElement('span',null,game.tileName(t));
let html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile,stage:'winner'}));assert.match(html,/甲胡了/);assert.match(html,/乙放炮/);assert.doesNotMatch(html,/flip-animation|score-overview/);html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile,stage:'flip'}));assert.match(html,/flip-animation/);assert.doesNotMatch(html,/score-overview/);html=renderToStaticMarkup(React.createElement(social.RoundEnd,{room,Tile,stage:'summary'}));assert.match(html,/score-overview/);
let table={code:'ABCD',round:1,players:room.players,tableEvents:[]};render(()=>experience.TableEventNotice({room:table,now:1000}));table={...table,tableEvents:[{seq:1,seat:1,from:0,kind:'peng',tile:16,at:1100},{seq:2,seat:2,from:null,kind:'an',tile:null,at:1100}]};render(()=>experience.TableEventNotice({room:table,now:1200}));html=renderToStaticMarkup(render(()=>experience.TableEventNotice({room:table,now:1200})));assert.match(html,/乙碰了甲的8筒/);timers.values().find(t=>t.delay===2300).fn();html=renderToStaticMarkup(render(()=>experience.TableEventNotice({room:table,now:1200})));assert.match(html,/丙暗杠/);assert.doesNotMatch(html,/8筒/);document.hidden=true;docListeners.get('visibilitychange')();assert.equal(render(()=>experience.TableEventNotice({room:table,now:1400})),null);reset();
const css=fs.readFileSync('app/globals.css','utf8');assert.doesNotMatch(css,/latest-discard::after/);assert.match(css,/immersive-app[\s\S]*side-panel\{display:none\}/);assert.match(css,/\.latest-discard\{outline:/);
console.log('PASS: actual fullscreen fallback/native/escape/scroll cleanup, sequential end-stage timers and output, queued source notices and concealed kong, background cleanup and outline-only latest discard.');
