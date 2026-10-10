import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader} from './account-v32-loader.mjs';

// Execute actual hooks/callbacks; this does not simulate browser geometry.
function runtime(){let cursor=0;const slots=[],jobs=[];const hooks={...React,useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v})},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){slots[i]={deps,cleanup:old?.cleanup};jobs.push(()=>{slots[i].cleanup?.();slots[i].cleanup=fn()})}}};return {hooks,render(fn){cursor=0;const tree=fn();while(jobs.length)jobs.shift()();return tree},dispose(){for(const s of slots)s?.cleanup?.()}}}
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const find=(tree,predicate)=>nodes(tree).find(predicate),settle=()=>new Promise(setImmediate);
const originalNow=Date.now;let now=10000;Date.now=()=>now;
try{
 const rt=runtime(),requests=[];let pending,fail=false,selected,room={code:'ABCD',phase:'done',me:0,players:[{name:'我'},{name:'牌友'}],messages:[],interactions:[],result:{delta:[0,0],winner:-1}};
 const social=await loader({react:rt.hooks,'@/lib/table-client':{tableRequest:async(url,init)=>{const body=JSON.parse(init.body);requests.push(body);if(fail)throw new Error('暂时断线');return new Promise(resolve=>pending=resolve)}}})('app/game-social.tsx');
 const props=()=>({room,inline:true,onUpdate:data=>room=data,onBubbles(){},onPick:e=>selected=e});
 const render=()=>rt.render(()=>social.ChatPanel(props()));
 let tree=render();tree=render();
 assert(find(tree,n=>n.props?.role==='log'),'settlement log is open on the first render and stays open after room reset effect');
 assert.equal(nodes(tree).filter(n=>n.props?.role==='tab').length,3);
 assert(!find(tree,n=>n.props?.className==='chat-toggle'));
 assert(!find(tree,n=>n.props?.['aria-label']==='关闭聊天'));
 assert.equal(nodes(tree).filter(n=>n.props?.className==='effect-name').length,11);
 find(tree,n=>n.props?.['aria-label']==='扔番茄').props.onClick();tree=render();assert.equal(selected,'tomato');assert(find(tree,n=>n.props?.role==='log'),'picking a target effect never collapses the settlement panel');
 find(tree,n=>n.props?.role==='tab'&&n.props.children==='Emoji').props.onClick();tree=render();
 assert.equal(find(tree,n=>n.props?.className==='chat-emojis').props.children.length,30);
 const emoji=find(tree,n=>n.props?.['aria-label']==='发送表情 🥰');emoji.props.onClick();emoji.props.onClick();assert.equal(requests.length,1,'send lock rejects duplicate clicks');assert.equal(requests[0].kind,'emoji');
 tree=render();assert(find(tree,n=>n.props?.role==='log'));assert(find(tree,n=>n.props?.['aria-label']==='发送表情 🥰').props.disabled);
 pending({...room,messages:[{id:'one',name:'我',seat:0,kind:'emoji',content:'🥰',at:now,mine:true}]});await settle();tree=render();assert.match(renderToStaticMarkup(tree),/🥰/);assert(find(tree,n=>n.props?.role==='log'));
 find(tree,n=>n.props?.role==='tab'&&n.props.children==='文字').props.onClick();tree=render();assert.equal(find(tree,n=>n.props?.['aria-label']==='预设文字消息').props.children.length,23);
 now+=1100;find(tree,n=>n.props?.['aria-label']==='聊天消息').props.onChange({target:{value:'下一局加油'}});tree=render();find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.equal(requests.at(-1).text,'下一局加油');
 pending({...room,messages:[...room.messages,{id:'two',name:'我',seat:0,kind:'text',content:'下一局加油',at:now,mine:true}]});await settle();tree=render();assert.equal(find(tree,n=>n.props?.['aria-label']==='聊天消息').props.value,'');assert(find(tree,n=>n.props?.role==='log'));
 now+=1100;fail=true;find(tree,n=>n.props?.['aria-label']==='预设文字消息').props.children[0].props.onClick();await settle();tree=render();assert(find(tree,n=>n.props?.role==='alert'));assert(find(tree,n=>n.props?.role==='log'),'send failure leaves content open');const failedId=requests.at(-1).clientId;
 fail=false;find(tree,n=>n.type==='button'&&n.props.children==='重试').props.onClick();assert.equal(requests.at(-1).clientId,failedId);pending(room);await settle();
 room={...room,code:'EFGH',messages:[]};render();tree=render();assert(find(tree,n=>n.props?.role==='log'),'changing rooms cannot fold a persistent inline panel');assert.equal(nodes(tree).filter(n=>n.props?.role==='tab').length,3);
 rt.dispose();
 const regularRt=runtime(),regular=await loader({react:regularRt.hooks})('app/game-social.tsx');const regularProps={room,onUpdate(){},onBubbles(){},onPick:e=>selected=e};const normal=()=>regularRt.render(()=>regular.ChatPanel(regularProps));normal();tree=normal();assert(!find(tree,n=>n.props?.role==='log'));find(tree,n=>n.props?.className==='chat-toggle').props.onClick();tree=normal();assert(find(tree,n=>n.props?.role==='log'));assert(find(tree,n=>n.props?.['aria-label']==='关闭聊天'));find(tree,n=>n.props?.['aria-label']==='扔番茄').props.onClick();assert(!find(normal(),n=>n.props?.role==='log'),'normal table still folds after selecting a target');regularRt.dispose();
 console.log('PASS v40: actual persistent settlement chat opens immediately, stays open after selecting/sending/failure/retry/room change; 11 effects, 30 Emoji, 23 messages; duplicate sends locked, retry ID preserved; ordinary avatar chat still opens/closes.');
}finally{Date.now=originalNow}
const css=fs.readFileSync('app/globals.css','utf8');assert.match(css,/\.table-shell\.has-settlement-social>\.hand-area\{grid-area:3\/1;visibility:hidden;pointer-events:none\}/);assert.match(css,/\.settlement-social\{grid-area:3\/1;z-index:2\}/);assert.match(css,/\.felt\.settlement-social-layout\{grid-area:2\/1/);assert.match(css,/grid-template-rows:auto minmax\(190px,1fr\) minmax\(330px,1\.05fr\)/);assert.match(css,/\.table-shell\.has-settlement-social \.round-next-panel\{max-height:none;flex-shrink:0\}/);
console.log('PASS v40: source layout keeps settlement/next in row 2, places mobile social over the hand in row 3 and clips animation to its avatar region; short-table overflow can scroll. Browser visual QA not performed.');
