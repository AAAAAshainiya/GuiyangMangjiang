import { db } from '@/db';
import { CHAT_EMOJIS, AVATARS, setRoomRules, advance, archiveRound, botDelay, actionContext, act, create, player, start, view, log, type Room } from '@/lib/game';
export const dynamic='force-dynamic';
import {interactionKind,validRoomCode as valid,roomCode} from '@/lib/interaction';
class RequestError extends Error {constructor(message:string,public status=400,public code='ACTION_REJECTED'){super(message)}}
function session(req:Request){return req.headers.get('cookie')?.match(/(?:^|; )mj_guest=([a-f0-9]{64})(?:;|$)/)?.[1]}
function reply(data:unknown,status=200,cookie?:string){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':`mj_guest=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`}:{})}})}
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function read(code:string){const row=await db().prepare('SELECT state, version, updated FROM mahjong_rooms WHERE code = ?').bind(code).first<{state:string,version:number,updated:number}>();if(!row||Date.now()-row.updated>7*86400000)throw new RequestError('房间不存在或已过期，请核对房间码',404);const r=JSON.parse(row.state) as Room;r.version=row.version;r.playVersion??=row.version;return r}
async function save(r:Room,gameChanged=true){const v=r.version??0;r.playVersion=(r.playVersion??v)+(gameChanged?1:0);r.version=v+1;const result=await db().prepare('UPDATE mahjong_rooms SET state = ?, version = ?, updated = ? WHERE code = ? AND version = ?').bind(JSON.stringify(r),v+1,Date.now(),r.code,v).run();return result.meta.changes===1}
async function visible(r:Room,id:string){
 const rows=await db().prepare('SELECT id, sender, name, kind, content, at FROM mahjong_chat WHERE code = ? ORDER BY at DESC, id DESC LIMIT 140').bind(r.code).all<any>();
 const all=rows.results.reverse(),seat=(m:any)=>r.players.findIndex(p=>p.id===m.sender);
 const interactions=all.filter((m:any)=>m.kind==='interaction').slice(-40).flatMap((m:any)=>{try{const v=JSON.parse(m.content),target=typeof v.targetId==='string'?r.players.findIndex(p=>p.id===v.targetId):v.target;return interactionKind(v.effect)&&Number.isInteger(target)&&target>=0&&target<r.players.length?[{id:m.id,seat:seat(m),name:m.name,effect:v.effect,target,at:m.at}]:[]}catch{return []}});
 return {...view(r,id),messages:all.filter((m:any)=>m.kind!=='interaction').slice(-100).map((m:any)=>({id:m.id,seat:seat(m),name:m.name,kind:m.kind,content:m.content,at:m.at,mine:m.sender===id})),interactions};
}
async function sendInteraction(r:Room,id:string,b:any,now:number){
 const me=r.players.findIndex(p=>p.id===id&&!p.bot);if(me<0)return reply({error:'请先加入房间'},403);
 if(!interactionKind(b.effect)||!Number.isInteger(b.target)||b.target<0||b.target>=r.players.length||b.target===me||typeof b.clientId!=='string'||!/^[a-f0-9-]{36}$/.test(b.clientId))return reply({error:'请选择一个表情和其他牌友的头像'},400);
 const previous=await db().prepare('SELECT id FROM mahjong_chat WHERE code = ? AND sender = ? AND client_id = ?').bind(r.code,id,b.clientId).first();if(previous)return reply(await visible(r,id));
 const inserted=await db().prepare("INSERT INTO mahjong_chat (id, code, sender, client_id, name, kind, content, at) SELECT ?, ?, ?, ?, ?, 'interaction', ?, ? WHERE NOT EXISTS (SELECT 1 FROM mahjong_chat WHERE code = ? AND sender = ? AND kind = 'interaction' AND at > ?) ON CONFLICT(code, sender, client_id) DO NOTHING").bind(crypto.randomUUID(),r.code,id,b.clientId,r.players[me].name,JSON.stringify({effect:b.effect,target:b.target,targetId:r.players[b.target].id}),now,r.code,id,now-3000).run();
 if(!inserted.meta.changes){const same=await db().prepare('SELECT id FROM mahjong_chat WHERE code = ? AND sender = ? AND client_id = ?').bind(r.code,id,b.clientId).first();if(!same)return reply({error:'互动间隔至少 3 秒，请稍等'},429)}
 await db().prepare("DELETE FROM mahjong_chat WHERE code = ? AND kind = 'interaction' AND id NOT IN (SELECT id FROM mahjong_chat WHERE code = ? AND kind = 'interaction' ORDER BY at DESC, id DESC LIMIT 40)").bind(r.code,r.code).run();
 return reply(await visible(r,id));
}
async function sendChat(r:Room,id:string,b:any,now:number){
 const p=r.players.find(p=>p.id===id&&!p.bot);if(!p)return reply({error:'请先加入房间'},403);
 if(typeof b.text!=='string'||typeof b.clientId!=='string'||!/^[a-f0-9-]{36}$/.test(b.clientId))return reply({error:'消息格式不正确'},400);
 const text=b.text.trim();if(!text||Array.from(text).length>100||!['text','emoji'].includes(b.kind)||b.kind==='emoji'&&!CHAT_EMOJIS.includes(text))return reply({error:'消息最多 100 字，表情请从面板选择'},400);
 const previous=await db().prepare('SELECT id FROM mahjong_chat WHERE code = ? AND sender = ? AND client_id = ?').bind(r.code,id,b.clientId).first();if(previous)return reply(await visible(r,id));
 const inserted=await db().prepare('INSERT INTO mahjong_chat (id, code, sender, client_id, name, kind, content, at) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM mahjong_chat WHERE code = ? AND sender = ? AND kind != \'interaction\' AND at > ?) ON CONFLICT(code, sender, client_id) DO NOTHING').bind(crypto.randomUUID(),r.code,id,b.clientId,p.name,b.kind,text,now,r.code,id,now-1000).run();
 if(!inserted.meta.changes){const same=await db().prepare('SELECT id FROM mahjong_chat WHERE code = ? AND sender = ? AND client_id = ?').bind(r.code,id,b.clientId).first();if(!same)return reply({error:'发送太快，请稍等一秒'},429);}
 await db().prepare("DELETE FROM mahjong_chat WHERE code = ? AND kind != 'interaction' AND id NOT IN (SELECT id FROM mahjong_chat WHERE code = ? AND kind != 'interaction' ORDER BY at DESC, id DESC LIMIT 100)").bind(r.code,r.code).run();
 return reply(await visible(r,id));
}
const PLAY_ACTIONS=['discard','hu','peng','gang','bu','pass'];
function receipt(r:Room,id:string,clientId:unknown){return r.actionReceipts?.find(a=>a.player===id&&a.id===clientId)}
function signature(b:any){const fields=[b.action,b.tile??null,b.version??null,b.context??null,b.name??null];if(b.avatar!==undefined)fields.push(b.avatar);if(b.rules!==undefined)fields.push(b.rules);return JSON.stringify(fields)}
function acknowledge(r:Room,id:string,clientId:string){return {clientId,status:receipt(r,id,clientId)?'applied':'not_found'}}
function remember(r:Room,id:string,b:any,left=false){if(!b.clientId)return;r.actionReceipts=[...(r.actionReceipts??[]),{id:b.clientId,player:id,signature:signature(b),at:Date.now(),...(left?{left:true}:{})}].slice(-128)}
async function outcome(r:Room,id:string,b:any,left=false){return {...(left?{left:true}:await visible(r,id)),...(b.clientId?{actionAck:acknowledge(r,id,b.clientId)}:{})}}
export async function GET(req:Request){try{
 const id=session(req);if(!id)return reply({session:true},200,token());
 const params=new URL(req.url).searchParams,code=params.get('room'),actionId=params.get('actionId');
 if(!code)return reply({session:true});if(!valid(code))return reply({error:'邀请码应为 4 位字母或数字，旧房间支持 8 位'},400);
 for(let n=0;n<5;n++){
  const r=await read(code),p=r.players.find(p=>p.id===id);
  if(!p){if(actionId&&receipt(r,id,actionId)?.left)return reply({left:true,actionAck:acknowledge(r,id,actionId)});return reply({error:'请先输入昵称加入房间'},403)}
  const gameChanged=advance(r,Date.now()),historyChanged=r.phase==='done'&&!!r.result&&!r.history?.some(h=>h.round===r.round);if(historyChanged)archiveRound(r,Date.now());let changed=gameChanged||historyChanged;
  if(Date.now()-p.seen>10000){p.seen=Date.now();changed=true}
  if(!changed||await save(r,gameChanged))return reply({...await visible(r,id),...(actionId?{actionAck:acknowledge(r,id,actionId)}:{})});
 }
 return reply({error:'牌桌忙碌，正在重新同步',code:'ROOM_BUSY'},409);
 }catch(e){console.error('table GET',e);return reply({error:e instanceof RequestError?e.message:'连接暂时中断，正在重试'},e instanceof RequestError?e.status:500)}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return reply({error:'请求来源不正确'},403);
 if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'请求过大'},413);
 const id=session(req);if(!id)return reply({error:'请刷新页面后重试'},401);
 let b:any;try{b=await req.json()}catch{throw new RequestError('请求内容不正确')}
 if(!b||typeof b!=='object'||typeof b.action!=='string')throw new RequestError('请求内容不正确');
 const now=Date.now();
 if(b.action==='create'){
  const name=String(b.name??'').trim().slice(0,12);if(!name)throw new RequestError('先给自己起个昵称');
  const previous=await db().prepare("SELECT code FROM mahjong_rooms WHERE json_extract(state, '$.host') = ? AND updated > ? LIMIT 8").bind(id,now-60000).all();if(previous.results.length>=8)throw new RequestError('开桌太频繁，请一分钟后再试');
  for(let n=0;n<16;n++){const code=roomCode(),r=create(code,id,name);r.players[0].avatar=AVATARS.includes(b.avatar)?b.avatar:AVATARS[0];r.version=0;r.playVersion=0;try{await db().prepare('INSERT INTO mahjong_rooms (code, state, version, updated) VALUES (?, ?, 0, ?)').bind(code,JSON.stringify(r),now).run();return reply(view(r,id))}catch(e){if(!(e instanceof Error)||!/unique|constraint/i.test(e.message)||n===15)throw e}}
 }
 const code=String(b.code??'').toUpperCase();if(!valid(code))throw new RequestError('邀请码应为 4 位字母或数字，旧房间支持 8 位');
 if(b.action==='interaction')return await sendInteraction(await read(code),id,b,now);
 if(b.action==='chat')return await sendChat(await read(code),id,b,now);
 if(b.clientId!==undefined&&(typeof b.clientId!=='string'||!/^[a-f0-9-]{36}$/.test(b.clientId)))throw new RequestError('操作编号不正确');
 if(b.context!==undefined&&(typeof b.context!=='string'||b.context.length>2048))throw new RequestError('操作状态不正确');
 for(let tries=0;tries<5;tries++){
  const r=await read(code),previous=receipt(r,id,b.clientId);let i=r.players.findIndex(p=>p.id===id);
  if(previous){if(previous.signature!==signature(b))throw new RequestError('操作编号已经使用',409,'ACTION_ID_CONFLICT');return reply(await outcome(r,id,b,previous.left))}
  if(b.action==='join'){
   if(i>=0)return reply(await visible(r,id));
   if(!['lobby','done'].includes(r.phase))throw new RequestError('牌局进行中，请等本局结束后加入');
   const name=String(b.name??'').trim().slice(0,12);if(!name)throw new RequestError('先给自己起个昵称');
   const at=r.players.findIndex(p=>p.bot);if(at>=0){const score=r.players[at].score;r.players[at]=player(id,name);r.players[at].score=score}else if(r.players.length<4)r.players.push(player(id,name));else throw new RequestError('四个座位都有人了');
   r.players.find(p=>p.id===id)!.avatar=AVATARS.includes(b.avatar)?b.avatar:AVATARS[0];
   if(!r.host||!r.players.some(p=>p.id===r.host&&!p.bot))r.host=id;log(r,`${name}入座了`);remember(r,id,b);
   if(await save(r))return reply(await outcome(r,id,b));continue;
  }
  if(i<0)throw new RequestError('请先加入房间',403);
  if(b.action==='rules'&&r.host!==id)throw new RequestError('只有房主可以修改计分规则',403);
  // Claim responses from different seats share a stable action context, while
  // every persisted change still uses the SQL compare-and-swap revision.
  const isPlay=PLAY_ACTIONS.includes(b.action);
  const stale=isPlay?(b.context!==undefined?b.context!==actionContext(r,i):b.version!==r.playVersion):(b.action!=='resume'&&b.clientId&&b.version!==r.playVersion);
  if(stale)return reply({error:'牌桌已更新，已为你同步最新操作',code:'STATE_CHANGED',state:await visible(r,id)},409);
  r.players[i].seen=now;
  let left=false;
  try{
   if(b.action==='rules'){setRoomRules(r,i,b.rules)}
   else if(b.action==='resume'){if(!['play','claim'].includes(r.phase))throw new Error('当前无需恢复手动操作');r.players[i].managed=false;if(r.phase==='play'&&r.turn===i)r.deadline=now+45000;log(r,`${r.players[i].name}已恢复手动操作`)}
   else if(b.action==='speed'){if(r.host!==id)throw new Error('只有房主可以设置快速模式');if(!['lobby','done'].includes(r.phase))throw new Error('下一局开始前可以调整模式');if(![0,1].includes(b.tile))throw new Error('模式设置不正确');r.fast=b.tile===1;log(r,r.fast?'快速模式已开启：人机等待半秒':'快速模式已关闭：人机等待两秒')}
   else if(b.action==='profile'){if(!['lobby','done'].includes(r.phase))throw new Error('本局结束后可以修改资料');const name=String(b.name??'').trim().slice(0,12);if(!name||!AVATARS.includes(b.avatar))throw new Error('请选择昵称和头像');r.players[i].name=name;r.players[i].avatar=b.avatar}
   else if(b.action==='leave'){
    const name=r.players[i].name;
    if(r.phase==='play'||r.phase==='claim'){r.players[i].id='bot:'+crypto.randomUUID();r.players[i].bot=true;r.players[i].name=name+'（托管）';r.players[i].ready=true;if(r.phase==='play'&&r.turn===i)r.deadline=now+botDelay(r)}
    else{r.players.splice(i,1);r.phase='lobby';r.result=null;r.dealer=Math.max(0,Math.min(r.dealer,r.players.length-1))}
    if(r.host===id)r.host=r.players.find(p=>!p.bot)?.id??'';log(r,`${name}离开牌桌`);left=true;
   }else if(b.action==='fill'||b.action==='removeBots'){
    if(r.host!==id)throw new Error('只有房主可以调整电脑');if(!['lobby','done'].includes(r.phase))throw new Error('本局结束后才能调整座位');
    if(b.action==='fill'){while(r.players.length<4){const n=r.players.length;r.players.push(player('bot:'+crypto.randomUUID(),['黔灵阿青','花溪小北','南明阿川'][n-1]??'电脑牌友',true))}log(r,'空位已用电脑补齐')}
    else{r.players=r.players.filter(p=>!p.bot);r.phase='lobby';r.result=null;r.dealer=Math.min(r.dealer,r.players.length-1)}
   }else if(b.action==='ready'){if(!['lobby','done'].includes(r.phase))throw new Error('请等待本局结束');r.players[i].managed=false;r.players[i].ready=!r.players[i].ready}
   else if(b.action==='start'){if(r.host!==id)throw new Error('只有房主可以开局');if(!['lobby','done'].includes(r.phase))throw new Error('本局尚未结束');r.dealer=Math.max(0,Math.min(r.dealer,r.players.length-1));start(r,now)}
   else if(isPlay)act(r,i,b.action,b.tile,now);
   else throw new Error('不支持这个操作');
  }catch(e){return reply({error:e instanceof Error?e.message:'操作不符合当前规则',code:'ACTION_REJECTED',state:await visible(await read(code),id)},400)}
  if(!left)advance(r,now);
  remember(r,id,b,left);
  if(await save(r))return reply(await outcome(r,id,b,left));
 }
 // A concurrent request bearing this same ID might still be committing.
 return reply({error:'牌桌忙碌，正在确认操作结果',code:'ROOM_BUSY'},503);
 }catch(e){console.error('table POST',e);return reply({error:e instanceof RequestError?e.message:'连接暂时中断，正在确认操作结果',code:e instanceof RequestError?e.code:'SERVER_ERROR'},e instanceof RequestError?e.status:500)}}
