'use client';
import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X,ChevronRight} from 'lucide-react';
import {CHAT_EMOJIS,tileName} from '@/lib/game';
import {INTERACTIONS,type InteractionKind} from '@/lib/interaction';
import {tableRequest} from '@/lib/table-client';
type Message={id:string,seat:number,name:string,kind:string,content:string,at:number,mine:boolean};
export function ChatBubble({messages,seat,now,enabled}:{messages:Message[],seat:number,now:number,enabled:boolean}){
 const message=enabled?[...messages].reverse().find(m=>m.seat===seat&&now-m.at<4000&&now>=m.at-1000):null;
 return message?<div className={'chat-bubble '+(message.kind==='emoji'?'emoji-bubble':'')} role="status">{message.content}</div>:null;
}
export function ChatPanel({room,onUpdate,onBubbles,onPick}:{room:any,onUpdate:(data:any)=>void,onBubbles:(enabled:boolean)=>void,onPick?:(effect:InteractionKind)=>void}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[unread,setUnread]=useState(0),[bubbles,setBubbles]=useState(true),[retry,setRetry]=useState<{text:string,kind:string,id:string}|null>(null);
 const seen=useRef<Set<string>|null>(null),scroll=useRef<HTMLDivElement>(null),locked=useRef(false),lastSent=useRef(0);
 const messages:Message[]=room.messages??[];
 useEffect(()=>{seen.current=null;setUnread(0);setDraft('');setRetry(null);setError('');setOpen(false)},[room.code]);
 useEffect(()=>{if(!seen.current){seen.current=new Set(messages.map(m=>m.id));return}const fresh=messages.filter(m=>!seen.current!.has(m.id));seen.current=new Set(messages.map(m=>m.id));if(open)setUnread(0);else setUnread(n=>n+fresh.filter(m=>!m.mine).length)},[room.messages,open]);
 useEffect(()=>{if(open&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight},[room.messages,open]);
 async function send(text:string,kind='text',id=crypto.randomUUID()){
  text=text.trim();if(!text||locked.current)return;if(Array.from(text).length>100){setError('最多发送 100 字');return}if(Date.now()-lastSent.current<1000){setError('稍等一秒再发送');return}
  locked.current=true;setSending(true);setError('');setRetry(null);
  try{const data=await tableRequest('/api/table',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chat',code:room.code,text,kind,clientId:id})});onUpdate(data);lastSent.current=Date.now();if(kind==='text')setDraft(current=>current.trim()===text?'':current);}
  catch(e){setError(e instanceof Error?e.message:'消息发送失败，请重试');setRetry({text,kind,id});}
  finally{locked.current=false;setSending(false)}
 }
 return <div className="chat-controls"><button className="chat-toggle" aria-label="打开互动与聊天" aria-expanded={open} onClick={()=>setOpen(!open)}><MessageCircle size={17}/>互动{unread>0&&!open&&<b>{unread>99?'99+':unread}</b>}</button>
 {open&&<section className="chat-panel" aria-label="房间互动与聊天"><div className="chat-panel-heading"><strong>互动与聊天</strong><label><input type="checkbox" checked={bubbles} onChange={e=>{setBubbles(e.target.checked);onBubbles(e.target.checked)}}/>桌面气泡</label><button aria-label="关闭聊天" onClick={()=>setOpen(false)}><X size={18}/></button></div>
 {onPick&&<><div className="target-effects">{INTERACTIONS.map(effect=><button key={effect.id} aria-label={effect.name} onClick={()=>{onPick(effect.id);setOpen(false)}}><span>{effect.emoji}</span>{effect.name}</button>)}</div><p className="interaction-help">选表情，再点对方头像 · 间隔 3 秒</p></>}
 <div className="chat-history" ref={scroll} aria-live="polite" aria-relevant="additions">{messages.length?messages.map(m=><div key={m.id} className={'chat-message '+(m.mine?'mine':'')}><small>{m.mine?'你':m.name} · {new Date(m.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</small><p>{m.content}</p></div>):<p className="chat-empty">和这桌的朋友打个招呼吧。</p>}</div>
 <div className="chat-emojis">{CHAT_EMOJIS.map(emoji=><button key={emoji} disabled={sending} aria-label={'发送表情 '+emoji} onClick={()=>void send(emoji,'emoji')}>{emoji}</button>)}</div>
 <div className="chat-quick">{['打得好！','等我一下','这牌怎么打'].map(text=><button key={text} disabled={sending} onClick={()=>void send(text)}>{text}</button>)}</div>
 <form onSubmit={e=>{e.preventDefault();void send(draft)}}><input aria-label="聊天消息" placeholder="说点什么，最多 100 字" value={draft} onChange={e=>setDraft(Array.from(e.target.value).slice(0,100).join(''))} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault()}}/><button type="submit" disabled={sending||!draft.trim()}><Send size={16}/>{sending?'发送中':'发送'}</button></form>
 {error&&<div className="chat-error" role="alert">{error}{retry&&<button disabled={sending} onClick={()=>void send(retry.text,retry.kind,retry.id)}>重试</button>}</div>}</section>}</div>
}
export function ScoreOverview({room}:{room:any}){
 const result=room.result;
 return <>{result.huParts?.length>0&&<p className="hu-breakdown">{result.huParts.map((p:any)=>`${p.name} ${p.points}`).join(' ＋ ')} ＝ {result.huValues[result.winner]} 分。{result.from<0?`三家各付 ${result.huPayable} 分。`:`${room.players[result.from].name}付 ${result.huPayable} 分。`}{result.hotPenalty>0&&`其中热炮额外 ${result.hotPenalty} 分；放炮者自己的鸡豆全部烧掉。`}</p>}<table className="score-overview"><thead><tr><th>牌友</th><th>胡</th><th>豆</th><th>鸡</th><th>合计</th></tr></thead><tbody>{room.players.map((p:any,i:number)=>{
  const hu=result.huValues?.[i]??(i===result.winner?result.hu[i]/(result.from<0?3:1):0);
  const bean=result.beanValues?.[i]??(p.melds.some((m:any)=>m.k==='gang')?null:0);
  const net=result.delta[i];return <tr key={i} className={i===room.me?'your-score':''}><td>{p.name}{i===room.me&&<small>你</small>}{result.burned?.[i]&&<small>热炮烧鸡豆</small>}</td><td>{hu}</td><td>{bean===null?'—':bean}</td><td>{result.values?.[i]??0}</td><td className={net>0?'positive':net<0?'negative':''}><b>{net>0?'+':''}{net}</b></td></tr>
 })}</tbody></table><p className="score-caption">胡、豆、鸡是自身分值；合计是本局实际盈亏。{result.scoringVersion===3?'胡列为牌型分，热炮额外 4 分计入实际收付。只有胡牌或听牌且未放热炮者收鸡豆；其余人仍须支付有效鸡豆。':result.beanRequiresReady&&'自己的豆仅在胡牌或听牌时有效；未听牌仍需付他人的有效豆分。'}{!result.beanValues&&'历史杠分基数未记录，以合计为准。'}</p></>;
}
const signed=(n:number)=>(n>0?'+':'')+n;
function huWith(result:any,me:number,other:number){
 if(result.winner<0)return 0;
 const n=result.huPayable??result.huValues?.[result.winner]??result.hu[result.winner]/(result.from<0?3:1);
 if(me===result.winner)return result.from<0||result.from===other?n:0;
 if(other===result.winner)return result.from<0||result.from===me?-n:0;
 return 0;
}
export function SettlementDetails({room}:{room:any}){
 const r=room.result,me=room.me,details=r.myChickenDetails;
 const eligible=r.eligible?.[me]??(me===r.winner||r.revealed?.[me]),modern=r.scoringVersion===3,burned=r.burned?.[me];
 const sources:Record<string,string>={hand:'手牌',peng:'碰牌',gang:'明杠／补杠',an:'暗杠',river:'自己打出的牌'};
 const rows=room.players.map((p:any,i:number)=>{
  const hu=huWith(r,me,i),chicken=r.winner<0?0:Array.isArray(r.chickenTransfers)?r.chickenTransfers.reduce((sum:number,t:any)=>sum+(t.from===i&&t.to===me?t.points:0)-(t.from===me&&t.to===i?t.points:0),0):(r.values?.[me]??0)-(r.values?.[i]??0);
  const bean=r.winner<0?0:Array.isArray(r.beanTransfers)?r.beanTransfers.reduce((sum:number,t:any)=>sum+(t.from===i&&t.to===me?t.points:0)-(t.from===me&&t.to===i?t.points:0),0):null;
  return {name:p.name,i,hu,chicken,bean,total:bean===null?null:hu+chicken+bean};
 }).filter((row:any)=>row.i!==me);
 return <details className="settlement-details"><summary>查看我的收付明细</summary><div className="settlement-body">
 <p>{r.winner<0?'流局，本局所有收付为 0。':burned?'你放了热炮：自己的手牌、碰杠、弃牌鸡和豆全部烧掉，不收分，也不为自己的弃牌鸡倒付；仍须支付其他有资格玩家的鸡豆。':eligible?'你已胡牌或听牌：手牌、碰杠和自己弃牌区的鸡都计分。':modern?'你未听牌：自己的弃牌鸡只向胡牌或听牌且未放热炮的人付分，不收其他人的弃牌鸡罚分；手牌及碰杠里的鸡不罚分。':'你未听牌：只为自己弃牌区的鸡付分，手牌及碰杠里的鸡不罚分。'}{r.winner>=0&&r.beanRequiresReady&&!burned&&(eligible?'你的杠计豆，仍需支付其他胡牌或听牌者的豆分。':'你自己的杠不计豆，但仍需支付胡牌或听牌者的豆分。')}</p>
 <h3>自己的鸡分：{r.values?.[me]??0}</h3>
 {details===null||details===undefined?<p className="detail-note">这局未记录逐张鸡分来源；以下收付按已保存的结算结果显示。</p>:details.length?<ul className="chicken-detail-list">{details.map((d:any,i:number)=><li key={i}><span>{sources[d.source]} · {tileName(d.tile)}{d.charge?'（冲锋鸡）':''}{d.tile===r.rooster?'（含翻牌鸡 +1）':''}<small>{d.count} 张 × {d.unit} 分</small></span><b>{eligible?d.points:-d.points} 分</b></li>)}</ul>:<p className="detail-note">没有计入鸡分的牌。</p>}
 <h3>与每家的收付</h3><p className="detail-note">正数是对方给你，负数是你给对方。{modern?'鸡分按收分资格逐家计算；热炮额外 4 分包含在实际胡分收付内。':'鸡分按双方自身鸡值相减。'}</p>
 <table className="transfer-table"><thead><tr><th>牌友</th><th>胡</th><th>豆</th><th>鸡</th><th>合计</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.i}><td>{row.name}<small>{modern?(r.burned?.[row.i]?'热炮 · 鸡豆烧掉':r.eligible?.[row.i]?'胡牌／听牌 · 可收鸡豆':'未听牌 · 不收鸡豆'):<>鸡：{r.values?.[me]??0} − ({r.values?.[row.i]??0})</>}</small></td><td>{signed(row.hu)}</td><td>{row.bean===null?'—':signed(row.bean)}</td><td>{signed(row.chicken)}</td><td>{row.total===null?'—':signed(row.total)}</td></tr>)}</tbody></table>
 {rows.some((row:any)=>row.bean===null)&&<p className="detail-note">这局开局时尚未记录逐家豆分，豆的实际净额仍保留在下面。</p>}
 <p className="net-equation">实际盈亏：胡 {signed(r.hu?.[me]??0)} ＋ 豆 {signed(r.beans?.[me]??0)} ＋ 鸡 {signed(r.chicken?.[me]??0)} ＝ <b>{signed(r.delta[me])}</b></p>
 </div></details>;
}
export function RoundEnd({room,Tile}:{room:any,Tile:any}){
 const [stage,setStage]=useState<'flip'|'summary'|'closed'>(room.result.flip!==null?'flip':'summary');
 useEffect(()=>{setStage(room.result.flip!==null?'flip':'summary');if(room.result.flip!==null){const timer=setTimeout(()=>setStage('summary'),2600);return()=>clearTimeout(timer)}},[room.code,room.round]);
 if(stage==='closed')return <button className="reopen-summary" onClick={()=>setStage('summary')}>查看本局结算</button>;
 return <div className="round-end" role="region" aria-label={stage==='flip'?'本局翻鸡':'本局积分结算'}>
 {stage==='flip'?<div className="flip-animation" role="status"><span className="end-kicker">本局翻鸡</span><div className="flip-scene"><div className="flip-card"><div className="flip-back"><Tile t={0} back/></div><div className="flip-face"><Tile t={room.result.flip}/></div></div><ChevronRight size={24}/><div className="rooster-card"><Tile t={room.result.rooster}/></div></div><p>翻出 {tileName(room.result.flip)} · {tileName(room.result.rooster)}为本局鸡</p></div>:<div className="central-summary"><div className="central-summary-heading"><div><span className="end-kicker">本局积分结算</span><h2>{room.result.winner<0?'流局 · 不加分、不扣分':room.players[room.result.winner].name+'胡了'}</h2></div><button onClick={()=>setStage('closed')} aria-label="收起结算总览"><X size={20}/></button></div><p className="end-pattern">{room.result.pattern} {room.result.kind}</p><ScoreOverview room={room}/>{room.result.flip!==null&&<p className="summary-chicken">翻 {tileName(room.result.flip)} · 本局鸡 {tileName(room.result.rooster)}</p>}<button className="summary-dismiss" onClick={()=>setStage('closed')}>收起总览，查看牌面</button></div>}
 </div>;
}
