import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader} from './account-v32-loader.mjs';
import {CHAT_EMOJIS} from '../lib/game.ts';
import {INTERACTIONS,interactionKind,interactionAction,InteractionTracker} from '../lib/interaction.ts';

assert.equal(CHAT_EMOJIS.length,30);assert.equal(new Set(CHAT_EMOJIS).size,30);assert.equal(INTERACTIONS.length,11);assert(!INTERACTIONS.some(e=>e.id==='clap'||e.name==='鼓掌'));assert.equal(interactionKind('clap'),false);assert.equal(interactionAction('clap'),'送上了掌声');
const tracker=new InteractionTracker();tracker.observe('TEST',[],1000);assert.deepEqual(tracker.observe('TEST',[{id:'old-clap',seat:0,target:1,effect:'clap',at:1001}],1002),[],'removed effect never animates');
const sql=new DatabaseSync(':memory:');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync('drizzle/'+f,'utf8'));
const DB={prepare(q){return {bind(...args){const stmt=sql.prepare(q);return {async first(){return stmt.get(...args)??null},async all(){return {results:stmt.all(...args)}},async run(){return {meta:{changes:stmt.run(...args).changes}}}}}}},async batch(stmts){const out=[];for(const s of stmts)out.push(await s.run());return out}};
const route=await loader({'@/db':{db:()=>DB},'cloudflare:workers':{env:{DB,BUCKET:{put:async()=>({})}}}})('app/api/table/route.ts');
const origin='https://example.test';const first=await route.GET(new Request(origin+'/api/table')),cookie=first.headers.get('set-cookie').split(';')[0];
async function post(body){const r=await route.POST(new Request(origin+'/api/table',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()}}
let room=(await post({action:'create',name:'结算互动测试'})).data;const code=room.code;room=(await post({action:'fill',code})).data;room=(await post({action:'ready',code})).data;room=(await post({action:'start',code})).data;assert.equal(room.phase,'play');room=(await post({action:'terminate',code,round:room.round,version:room.version,clientId:crypto.randomUUID()})).data;assert.equal(room.phase,'done');
const settlement=structuredClone(room.result),scores=room.players.map(p=>p.score),version=room.version;
for(const emoji of CHAT_EMOJIS){sql.prepare('UPDATE mahjong_chat SET at=at-1100 WHERE code=?').run(code);const result=await post({action:'chat',code,text:emoji,kind:'emoji',clientId:crypto.randomUUID()});assert.equal(result.status,200,emoji);assert(result.data.messages.some(m=>m.content===emoji));assert.equal(result.data.phase,'done');assert.equal(result.data.version,version);assert.deepEqual(result.data.result,settlement);assert.deepEqual(result.data.players.map(p=>p.score),scores)}
assert.equal((await post({action:'interaction',code,effect:'clap',target:1,clientId:crypto.randomUUID()})).status,400);
sql.prepare('INSERT INTO mahjong_chat (id,code,sender,client_id,name,kind,content,at) VALUES (?,?,?,?,?,?,?,?)').run('archived-clap',code,cookie.split('=')[1],crypto.randomUUID(),'旧发送者','interaction',JSON.stringify({effect:'clap',target:1,targetName:'旧接收者'}),Date.now()-500);
sql.prepare('UPDATE mahjong_chat SET at=at-3100 WHERE code=?').run(code);
const sent=await post({action:'interaction',code,effect:'lucky',target:1,clientId:crypto.randomUUID()});assert.equal(sent.status,200);assert.deepEqual(sent.data.result,settlement);assert.equal(sent.data.version,version);assert(sent.data.messages.some(m=>m.id==='archived-clap'&&m.effect==='clap'&&m.targetName==='旧接收者'));assert(!sent.data.interactions.some(m=>m.effect==='clap'));
console.log('PASS v39: 30 unique Emoji accepted by actual settled-room API without rescoring or changing game version; clap rejected, archived log remains readable and never animates.');

const actual=await loader()('app/settlement-interactions.tsx');const fixture={...room,me:2,players:room.players.map((p,i)=>({...p,name:i===1?'<script>名字</script>':'玩家'+i}))};
const props={room:fixture,targetEffect:'tomato',interactionBusy:false,onInteract:async()=>{},onPick(){},onUpdate(){},onBubbles(){},onCancel(){}};
const html=renderToStaticMarkup(React.createElement(actual.SettlementInteractions,props));assert.match(html,/aria-label="结算期间互动"/);assert.equal((html.match(/data-avatar-seat=/g)||[]).length,4);assert.equal((html.match(/class="chat-toggle"/g)||[]).length,1);assert.match(html,/点对方头像：扔番茄/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
const idle=renderToStaticMarkup(React.createElement(actual.SettlementInteractions,{...props,targetEffect:null}));assert.equal((idle.match(/<button[^>]*data-avatar-seat[^>]*disabled/g)||[]).length,3);
const busy=renderToStaticMarkup(React.createElement(actual.SettlementInteractions,{...props,interactionBusy:true}));assert.equal((busy.match(/<button[^>]*data-avatar-seat[^>]*disabled/g)||[]).length,3);assert.match(busy,/正在发送/);
const children=[];const load=loader({'./game-social':{ChatPanel:p=>{children.push(p);return null}},react:{...React,useRef:v=>({current:v})}});const component=await load('app/settlement-interactions.tsx');renderToStaticMarkup(React.createElement(component.SettlementInteractions,props));assert.equal(children.length,1);assert.equal(children[0].inline,true);assert.equal(children[0].blocked,undefined);
let clicked;let canceled=false;const capture=await loader({'./game-social':{ChatPanel:p=>p.renderHeader(React.createElement('button',null,'互动'))},react:{...React,useRef:v=>({current:v})}})('app/settlement-interactions.tsx');
const tree=capture.SettlementInteractions({...props,onInteract:async i=>clicked=i,onCancel:()=>canceled=true});
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];const chatNode=nodes(tree).find(n=>n.props?.renderHeader);const header=chatNode.props.renderHeader(React.createElement('button',null,'互动'));const target=nodes(header).find(n=>n.props?.['data-avatar-seat']===1);await target.props.onClick();assert.equal(clicked,1);nodes(header).find(n=>n.props?.className==='text-button').props.onClick();assert.equal(canceled,true);
const layer=nodes(header).find(n=>n.props?.table&&n.props?.room);const stage=nodes(header).find(n=>n.props?.className==='settlement-avatar-stage');assert.equal(layer.props.table,stage.props.ref,'animation is bounded by the avatar stage, not the bill/felt');assert.equal(layer.props.blocked,undefined);
const css=fs.readFileSync('app/globals.css','utf8');assert.match(css,/\.felt\.settlement-social-layout\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(230px,34%\)/);assert.match(css,/\.settlement-social\{grid-area:1\/2/);assert.match(css,/\.settlement-social\{grid-area:2\/1/);assert.match(css,/\.settlement-avatar-stage>\.interaction-layer\{[^}]*overflow:hidden;pointer-events:none/);assert(!css.includes('.end-overlay-open .chat-controls'));assert(!css.includes('hand-clap-'));
console.log('PASS v39: actual settlement social component for rotated seat, available/locked targets, safe names and cancellation; inline chat and animation ref isolation; responsive grid/CSS containment. No browser geometry simulation.');
