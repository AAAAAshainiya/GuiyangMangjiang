import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as sound from '../lib/game-sound.ts';
let cursor=0;const slots=[],jobs=[];
const hooks={useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value})},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>{slots[i]=v}]},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){slots[i]={deps,cleanup:old?.cleanup};jobs.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})}}};
const source=ts.transpileModule(fs.readFileSync('app/game-audio.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sources=[],contexts=[],handlers=new Map();
class Param{value=0;setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class Node{gain=new Param();frequency=new Param();Q=new Param();connect(){}disconnect(){}start(t){this.at=t}stop(){this.stops=(this.stops??0)+1}}
class AudioContext{state='suspended';currentTime=1;sampleRate=8000;destination=new Node();constructor(){contexts.push(this)}createGain(){return new Node()}createOscillator(){const n=new Node();sources.push(n);return n}createBufferSource(){return this.createOscillator()}createBiquadFilter(){return new Node()}createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)}}async resume(){this.state='running'}async close(){this.state='closed'}}
const document={visibilityState:'visible',addEventListener:(event,fn)=>handlers.set(event,fn),removeEventListener:event=>handlers.delete(event)};
const windowHandlers=new Map();const context=vm.createContext({Date,window:{AudioContext,addEventListener:(e,f)=>windowHandlers.set(e,f),removeEventListener:e=>windowHandlers.delete(e)},document});const module=new vm.SourceTextModule(source,{context});
// Synthetic imports must share the VM context.
const shared={};for(const [name,m] of Object.entries({'react':hooks,'react/jsx-runtime':jsx,'lucide-react':icons,'@/lib/game-sound':sound,'@/components/ui/button':{Button:props=>React.createElement('button',props)}}))shared[name]=new vm.SyntheticModule(Object.keys(m),function(){for(const k of Object.keys(m))this.setExport(k,m[k])},{context});
await module.link(name=>shared[name]);await module.evaluate();const {SoundToggle,useTableSound}=module.namespace;
let html=renderToStaticMarkup(React.createElement(SoundToggle,{enabled:false,onToggle:()=>{}}));assert.match(html,/aria-label="开启音效"/);assert.match(html,/aria-pressed="false"/);assert.match(html,/音效关/);
html=renderToStaticMarkup(React.createElement(SoundToggle,{enabled:true,onToggle:()=>{}}));assert.match(html,/关闭音效/);assert.match(html,/aria-pressed="true"/);assert.match(html,/音效开/);
let errors=[];function render(room){cursor=0;const ctrl=useTableSound(room,Date.now(),message=>errors.push(message));while(jobs.length)jobs.shift()();return ctrl}
let room={code:'ABCDEFGH',round:1,phase:'play',turn:1,me:0,options:[],deadline:Date.now()+45000,soundEvents:[]};let ctrl=render(room);assert.equal(ctrl.enabled,false);assert.equal(contexts.length,0,'no audio context is created before the user enables it');
let silentCount=sources.length;windowHandlers.get('mahjong-interaction')({detail:{effect:'lucky'}});assert.equal(sources.length,silentCount);await ctrl.toggle();ctrl=render(room);assert.equal(ctrl.enabled,true);assert.equal(contexts.length,1);assert(sources.length>0,'opening plays a short confirmation');
let interactionCount=sources.length;windowHandlers.get('mahjong-interaction')({detail:{effect:'lucky'}});assert(sources.length>interactionCount,'enabled interaction gets its short sound');
room={...room,soundEvents:[{seq:1,kind:'draw',seat:1,at:Date.now()}]};let n=sources.length;ctrl=render(room);assert(sources.length>n);n=sources.length;render(room);assert.equal(sources.length,n,'rerenders are silent');
room={...room,round:2,soundEvents:[...room.soundEvents,{seq:2,kind:'draw',seat:1,at:Date.now()}]};n=sources.length;ctrl=render(room);assert(sources.length>n);assert(sources.slice(n).every(s=>s.stops===1),'round cleanup runs before new-round sound playback');
await ctrl.toggle();ctrl=render(room);assert.equal(ctrl.enabled,false);silentCount=sources.length;windowHandlers.get('mahjong-interaction')({detail:{effect:'flock'}});assert.equal(sources.length,silentCount,'mute covers interaction audio');assert(sources.every(s=>s.stops>=2));
room={...room,soundEvents:[...room.soundEvents,{seq:3,kind:'gang',seat:1,at:Date.now()}]};n=sources.length;ctrl=render(room);assert.equal(sources.length,n);
await ctrl.toggle();n=sources.length;ctrl=render(room);assert.equal(sources.length,n,'unmuting never replays muted actions');
document.visibilityState='hidden';handlers.get('visibilitychange')();room={...room,soundEvents:[...room.soundEvents,{seq:4,kind:'hu',seat:1,at:Date.now()}]};n=sources.length;render(room);assert.equal(sources.length,n);document.visibilityState='visible';handlers.get('visibilitychange')();render(room);assert.equal(sources.length,n,'returning from the background does not replay old cues');
for(const slot of slots)slot?.cleanup?.();assert.equal(contexts[0].state,'closed');assert.equal(handlers.size,0);assert.equal(windowHandlers.size,0);assert.deepEqual(errors,[]);
slots.length=0;jobs.length=0;context.window.AudioContext=class extends AudioContext{async resume(){throw new Error('音效暂时无法开启')}};ctrl=render(room);await ctrl.toggle();ctrl=render(room);assert.equal(ctrl.enabled,false);assert.deepEqual(errors,['音效暂时无法开启，请重试'],'audio permission failures stay within the sound control');for(const slot of slots)slot?.cleanup?.();
console.log('PASS: sound switch accessibility, explicit activation, hook event deduplication, new-round cleanup ordering, immediate mute, no history on unmute/background return and context disposal.');
