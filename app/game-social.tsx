'use client';
import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X,ChevronRight} from 'lucide-react';
import {CHAT_EMOJIS,tileName} from '@/lib/game';
type Message={id:string,seat:number,name:string,kind:string,content:string,at:number,mine:boolean};
export function ChatBubble({messages,seat,now,enabled}:{messages:Message[],seat:number,now:number,enabled:boolean}){
 const message=enabled?[...messages].reverse().find(m=>m.seat===seat&&now-m.at<4000&&now>=m.at-1000):null;
 return message?<div className={'chat-bubble '+(message.kind==='emoji'?'emoji-bubble':'')} role="status">{message.content}</div>:null;
}
export function ChatPanel({room,onUpdate,onBubbles}:{room:any,onUpdate:(data:any)=>void,onBubbles:(enabled:boolean)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[unread,setUnread]=useState(0),[bubbles,setBubbles]=useState(true),[retry,setRetry]=useState<{text:string,kind:string,id:string}|null>(null);
 const seen=useRef<Set<string>|null>(null),scroll=useRef<HTMLDivElement>(null),locked=useRef(false),lastSent=useRef(0);
 const messages:Message[]=room.messages??[];
 useEffect(()=>{seen.current=null;setUnread(0);setDraft('');setRetry(null);setError('');setOpen(false)},[room.code]);
 useEffect(()=>{if(!seen.current){seen.current=new Set(messages.map(m=>m.id));return}const fresh=messages.filter(m=>!seen.current!.has(m.id));seen.current=new Set(messages.map(m=>m.id));if(open)setUnread(0);else setUnread(n=>n+fresh.filter(m=>!m.mine).length)},[room.messages,open]);
 useEffect(()=>{if(open&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight},[room.messages,open]);
 async function send(text:string,kind='text',id=crypto.randomUUID()){
  text=text.trim();if(!text||locked.current)return;if(Array.from(text).length>100){setError('最多发送 100 字');return}if(Date.now()-lastSent.current<1000){setError('稍等一秒再发送');return}
  locked.current=true;setSending(true);setError('');setRetry(null);
  try{const res=await fetch('/api/table',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chat',code:room.code,text,kind,clientId:id})});const data:any=await res.json();if(!res.ok)throw new Error(data.error||'发送失败');onUpdate(data);lastSent.current=Date.now();if(kind==='text')setDraft(current=>current.trim()===text?'':current);}
  catch(e){setError(e instanceof Error?e.message:'消息发送失败，请重试');setRetry({text,kind,id});}
  finally{locked.current=false;setSending(false)}
 }
 return <div className="chat-controls"><button className="chat-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}><MessageCircle size={17}/>牌友聊天{unread>0&&!open&&<b>{unread>99?'99+':unread}</b>}</button>
 {open&&<section className="chat-panel" aria-label="房间聊天"><div className="chat-panel-heading"><strong>这桌的聊天</strong><label><input type="checkbox" checked={bubbles} onChange={e=>{setBubbles(e.target.checked);onBubbles(e.target.checked)}}/>桌面气泡</label><button aria-label="关闭聊天" onClick={()=>setOpen(false)}><X size={18}/></button></div>
 <div className="chat-history" ref={scroll} aria-live="polite" aria-relevant="additions">{messages.length?messages.map(m=><div key={m.id} className={'chat-message '+(m.mine?'mine':'')}><small>{m.mine?'你':m.name} · {new Date(m.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small><p>{m.content}</p></div>):<p className="chat-empty">和这桌的朋友打个招呼吧。</p>}</div>
 <div className="chat-emojis">{CHAT_EMOJIS.map(emoji=><button key={emoji} disabled={sending} aria-label={'发送表情 '+emoji} onClick={()=>void send(emoji,'emoji')}>{emoji}</button>)}</div>
 <div className="chat-quick">{['打得好！','等我一下','这牌怎么打'].map(text=><button key={text} disabled={sending} onClick={()=>void send(text)}>{text}</button>)}</div>
 <form onSubmit={e=>{e.preventDefault();void send(draft)}}><input aria-label="聊天消息" placeholder="说点什么，最多 100 字" value={draft} onChange={e=>setDraft(Array.from(e.target.value).slice(0,100).join(''))} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault()}}/><button type="submit" disabled={sending||!draft.trim()}><Send size={16}/>{sending?'发送中':'发送'}</button></form>
 {error&&<div className="chat-error" role="alert">{error}{retry&&<button disabled={sending} onClick={()=>void send(retry.text,retry.kind,retry.id)}>重试</button>}</div>}</section>}</div>
}
export function ScoreOverview({room}:{room:any}){
 const result=room.result;
 return <><table className="score-overview"><thead><tr><th>牌友</th><th>胡</th><th>豆</th><th>鸡</th><th>合计</th></tr></thead><tbody>{room.players.map((p:any,i:number)=>{
  const hu=result.huValues?.[i]??(i===result.winner?result.hu[i]/(result.from<0?3:1):0);
  const bean=result.beanValues?.[i]??(p.melds.some((m:any)=>m.k==='gang')?null:0);
  const net=result.delta[i];return <tr key={i} className={i===room.me?'your-score':''}><td>{p.name}{i===room.me&&<small>你</small>}</td><td>{hu}</td><td>{bean===null?'—':bean}</td><td>{result.values?.[i]??0}</td><td className={net>0?'positive':net<0?'negative':''}><b>{net>0?'+':''}{net}</b></td></tr>
 })}</tbody></table><p className="score-caption">胡、豆、鸡是自身分值；合计是本局实际盈亏。{!result.beanValues&&'历史杠分基数未记录，以合计为准。'}</p></>;
}
export function RoundEnd({room,Tile}:{room:any,Tile:any}){
 const [stage,setStage]=useState<'flip'|'summary'|'closed'>(room.result.flip!==null?'flip':'summary');
 useEffect(()=>{setStage(room.result.flip!==null?'flip':'summary');if(room.result.flip!==null){const timer=setTimeout(()=>setStage('summary'),2600);return()=>clearTimeout(timer)}},[room.code,room.round]);
 if(stage==='closed')return <button className="reopen-summary" onClick={()=>setStage('summary')}>查看本局结算</button>;
 return <div className="round-end" role="region" aria-label={stage==='flip'?'本局翻鸡':'本局积分结算'}>
 {stage==='flip'?<div className="flip-animation" role="status"><span className="end-kicker">本局翻鸡</span><div className="flip-scene"><div className="flip-card"><div className="flip-back"><Tile t={0} back/></div><div className="flip-face"><Tile t={room.result.flip}/></div></div><ChevronRight size={24}/><div className="rooster-card"><Tile t={room.result.rooster}/></div></div><p>翻出 {tileName(room.result.flip)} · {tileName(room.result.rooster)}为本局鸡</p></div>:<div className="central-summary"><div className="central-summary-heading"><div><span className="end-kicker">本局积分结算</span><h2>{room.result.winner<0?'流局 · 不加分、不扣分':room.players[room.result.winner].name+'胡了'}</h2></div><button onClick={()=>setStage('closed')} aria-label="收起结算总览"><X size={20}/></button></div><p className="end-pattern">{room.result.pattern} {room.result.kind}</p><ScoreOverview room={room}/>{room.result.flip!==null&&<p className="summary-chicken">翻 {tileName(room.result.flip)} · 本局鸡 {tileName(room.result.rooster)}</p>}<button className="summary-dismiss" onClick={()=>setStage('closed')}>收起总览，查看牌面</button></div>}
 </div>;
}
