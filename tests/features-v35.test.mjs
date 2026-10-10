import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as React from 'react';
import {loader} from './account-v32-loader.mjs';

const load=loader(),themes=await load('lib/themes.ts'),engine=await load('lib/game.ts'),solo=await load('lib/solo.ts');
for(const id of ['midnight','rose','sakura'])assert.equal(themes.THEMES.find(t=>t.id===id).texture,'none');
for(const id of ['grape','walnut','peach'])assert.notEqual(themes.THEMES.find(t=>t.id===id).texture,'none');

// Fresh table: no wall, dealt tiles, replay, bot movement or elapsed timer yet.
for(const fast of [false,true]){
 const rules=engine.defaultRules();rules.hu.ping=9;
 const g=new solo.SoloGame('开局测试','🐼',1000,fast,rules,'owner',false,false);
 assert.equal(g.room.phase,'lobby');assert.equal(g.room.round,0);assert.equal(g.room.wall.length,0);assert(g.room.players.every(p=>p.hand.length===0));
 assert.equal(g.tick(100000),false);assert.equal(g.pausedAt,null);assert.equal(g.room.replay,undefined);
 const restored=solo.SoloGame.restore(g.serialize(100000),200000);assert(restored);assert.equal(restored.room.phase,'lobby');assert.equal(restored.pausedAt,null);
 restored.human('recordReplay',1,200001);assert.equal(restored.room.replay,undefined);
 restored.human('start',undefined,200002);assert.equal(restored.room.round,1);assert.equal(restored.room.phase,'play');assert.equal(restored.room.roundRules.hu.ping,9);assert(restored.room.replay);assert.equal(restored.room.fast,fast);
 assert.equal(restored.room.wall.length+restored.room.players.reduce((n,p)=>n+p.hand.length,0),108);
 assert.throws(()=>restored.human('start',undefined,200003),/尚未结束/);
 const active=solo.SoloGame.restore(restored.serialize(200003),300000);assert.equal(active.pausedAt,300000);
 engine.terminateRound(restored.room,0,200004);restored.human('ready',undefined,200005);assert.equal(restored.room.round,2);
}

// Actual root render receives the authenticated identity before any client effect.
let cookie='A',lookupFailure=false;
const users={A:{id:'a',theme:'sakura',nickname:'甲'},B:{id:'b',theme:'midnight',nickname:'乙'}};
const layout=await loader({'./globals.css':{},'./account-context':{AccountProvider:({children})=>children},'next/headers':{headers:async()=>new Headers({cookie})},'@/lib/account-server':{getAccount:async req=>{if(lookupFailure)throw new Error('offline');return users[req.headers.get('cookie')]??null}}})('app/layout.tsx');
assert.equal(layout.dynamic,'force-dynamic');
for(const identity of ['A','B','guest']){
 cookie=identity;const root=await layout.default({children:'table'}),theme=users[identity]?.theme??'jade';
 assert.equal(root.props['data-mj-theme'],theme);assert.deepEqual(JSON.parse(JSON.stringify(root.props.style)),JSON.parse(JSON.stringify(themes.themeStyle(theme))));
 const provider=root.props.children.props.children;assert.equal(provider.props.initialUser?.id,users[identity]?.id);
}
lookupFailure=true;const offline=await layout.default({children:'table'});assert.equal(offline.props.children.props.children.props.initialUser,undefined,'database failures leave client recovery available');

// Server identity initializes the actual provider; logout resets all variables.
let cursor=0,slots=[],effects=[],requests=0;const style=new Map();
globalThis.document={documentElement:{dataset:{},style:{setProperty:(k,v)=>style.set(k,v)}}};globalThis.localStorage={setItem(){}};
globalThis.fetch=async()=>{requests++;return {ok:true,json:async()=>({user:null})}};
const hooks={...React,useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useEffect:fn=>effects.push(fn),useCallback:fn=>fn};
const context=await loader({'react':hooks})('app/account-context.tsx');
cursor=0;let tree=context.AccountProvider({children:'table',initialUser:users.A});assert.equal(tree.props.value.user.id,'a');assert.equal(tree.props.value.ready,true);for(const effect of effects)effect();await new Promise(setImmediate);assert.equal(requests,0);
context.applyTheme('rose');assert.equal(document.documentElement.dataset.mjTheme,'rose');
tree.props.value.accept(null);assert.equal(document.documentElement.dataset.mjTheme,'jade');assert.equal(style.get('--mj-felt'),themes.THEMES[0].felt);
tree.props.value.accept(users.B);assert.equal(document.documentElement.dataset.mjTheme,'midnight');assert.equal(style.get('--mj-texture'),'none');
delete globalThis.document;delete globalThis.localStorage;delete globalThis.fetch;

// Structural CSS checks are not a browser visual test.
const css=fs.readFileSync('app/globals.css','utf8');assert.match(css,/\.table-shell\{isolation:isolate\}/);
assert.match(css,/body:has\(\[data-slot="dialog-overlay"\]\[data-state="open"\]\) \.table-shell \*\{pointer-events:none!important\}/);
console.log('PASS v35: unstarted solo/restoration/first replay/next round, per-account root theme before hydration, guest/logout reset, outage recovery, selected texture removal and modal stacking/pointer boundaries.');
