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
const css=fs.readFileSync('app/globals.css','utf8');assert.match(css,/\.settlement-summary-frame\{position:relative;flex:1 1 auto/);assert.match(css,/\.settlement-social-overlay\{position:absolute;inset:0/);assert(!css.includes('has-settlement-social'));assert.match(css,/\.settlement-chat-panel \.chat-history\{flex:1 1 58%/);assert.match(css,/\.settlement-social-layout \.round-next-panel\{max-height:none;flex-shrink:0\}/);
console.log('PASS v40/v41: inline chat still remains open while its popup is mounted; popup occupies the bill frame, no hand-cover layout, larger log share and next-round controls outside. Browser visual QA not performed.');

// Actual end-screen state: default collapsed, same-frame overlay and independent next-round action.
const endRt=runtime(),social=await loader({react:endRt.hooks})('app/game-social.tsx');
let started=0,reported;
const endRoom={code:'ABCD',round:3,me:0,players:[{name:'我'},{name:'牌友'}],result:{winner:-1,flip:null,pattern:'流局',kind:'流局'}};
const endProps={room:endRoom,Tile:()=>null,nextRound:React.createElement('div',{className:'next-round'},React.createElement('button',{onClick:()=>started++},'下一局')),onOpenChange:open=>reported=open,interactionPanel:close=>React.createElement('section',{'aria-label':'结算期间互动'},React.createElement('button',{onClick:close},'返回结算'))};
const endRender=()=>endRt.render(()=>social.RoundEnd(endProps));
let endTree=endRender();assert(!find(endTree,n=>n.props?.className==='settlement-social-overlay'));
let toggle=find(endTree,n=>n.props?.className==='settlement-social-toggle');assert.equal(toggle.props['aria-expanded'],false);toggle.props.onClick();endTree=endRender();
const frame=find(endTree,n=>n.props?.className==='settlement-summary-frame'),overlay=find(endTree,n=>n.props?.className==='settlement-social-overlay'),nextPanel=find(endTree,n=>n.props?.['aria-label']==='下一局操作');assert(overlay);assert(nodes(frame).includes(overlay));assert(!nodes(frame).includes(nextPanel),'next-round bar is outside both bill and popup');assert.equal(find(endTree,n=>n.props?.className==='central-summary').props.inert,true);
find(nextPanel,n=>n.type==='button'&&n.props.children==='下一局').props.onClick();assert.equal(started,1,'next-round operation remains usable while popup is open');
find(overlay,n=>n.type==='button'&&n.props.children==='返回结算').props.onClick();endTree=endRender();assert(!find(endTree,n=>n.props?.className==='settlement-social-overlay'));assert.equal(find(endTree,n=>n.props?.className==='central-summary').props.inert,undefined);
find(endTree,n=>n.props?.className==='settlement-social-toggle').props.onClick();endTree=endRender();find(endTree,n=>n.props?.['aria-label']==='收起结算总览').props.onClick();endTree=endRender();assert.equal(reported,false);assert(!find(endTree,n=>n.props?.className==='settlement-social-overlay'));find(endTree,n=>n.props?.className==='reopen-summary').props.onClick();endTree=endRender();assert.equal(reported,true);assert.equal(find(endTree,n=>n.props?.className==='settlement-social-toggle').props['aria-expanded'],false);
endRt.dispose();
console.log('PASS v41: actual RoundEnd opens collapsed, overlays only the bill frame, keeps next-round action independent, disables hidden bill, closes and reopens without a stale popup.');
