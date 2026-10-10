'use client';
import {settlementLedger} from '@/lib/settlement-ledger';
export {settlementLedger} from '@/lib/settlement-ledger';
import {Button} from '@/components/ui/button';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {MessageCircle,Send,X,ChevronRight} from 'lucide-react';
import {CHAT_EMOJIS,tileName,defaultRules,isChicken} from '@/lib/game';
import {INTERACTIONS,QUICK_MESSAGES,conversationMessages,interactionAction,type RoomMessage,type InteractionKind} from '@/lib/interaction';
import {InteractionArtwork} from './interaction-artwork';
import {tableRequest} from '@/lib/table-client';
import {winnerText,type EndStage} from '@/lib/table-events';
type Message=RoomMessage;
export function ChatBubble({messages,seat,now,enabled}:{messages:Message[],seat:number,now:number,enabled:boolean}){
 const message=enabled?[...messages].reverse().find(m=>m.kind!=='interaction'&&m.seat===seat&&now-m.at<4000&&now>=m.at-1000):null;
 return message?<div className={'chat-bubble '+(message.kind==='emoji'?'emoji-bubble':'')} role="status">{message.content}</div>:null;
}
export function ChatPanel({room,onUpdate,onBubbles,onPick,blocked=false,inline=false,renderHeader}:{room:any,onUpdate:(data:any)=>void,onBubbles:(enabled:boolean)=>void,onPick?:(effect:InteractionKind)=>void,blocked?:boolean,inline?:boolean,renderHeader?:(toggle:ReactNode)=>ReactNode}){
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState(''),[unread,setUnread]=useState(0),[bubbles,setBubbles]=useState(true),[retry,setRetry]=useState<{text:string,kind:string,id:string}|null>(null),[tab,setTab]=useState<'interaction'|'emoji'|'text'>('interaction');
 const expanded=inline||open;
 const seen=useRef<Set<string>|null>(null),scroll=useRef<HTMLDivElement>(null),locked=useRef(false),lastSent=useRef(0),follow=useRef(true),panel=useRef<HTMLElement>(null);
 const messages=conversationMessages(room);
 useEffect(()=>{seen.current=null;setUnread(0);setDraft('');setRetry(null);setError('');setOpen(false);setTab('interaction');follow.current=true},[room.code]);
 useEffect(()=>{if(blocked)setOpen(false)},[blocked]);
 useEffect(()=>{if(!seen.current){seen.current=new Set(messages.map(m=>m.id));return}const fresh=messages.filter(m=>!seen.current!.has(m.id));seen.current=new Set(messages.map(m=>m.id));if(expanded)setUnread(0);else setUnread(n=>n+fresh.filter(m=>!m.mine).length)},[room.messages,room.interactions,expanded]);
 useEffect(()=>{if(expanded&&scroll.current&&follow.current)scroll.current.scrollTop=scroll.current.scrollHeight},[room.messages,room.interactions,expanded]);
 useEffect(()=>{
  if(!open||blocked||inline)return;
  const element=panel.current,seat=element?.closest('.self-seat'),felt=element?.closest('.felt');if(!element||!seat||!felt)return;
  const fit=()=>{const bounds=felt.getBoundingClientRect(),anchor=seat.getBoundingClientRect();const available=Math.max(120,anchor.top-Math.max(0,bounds.top)-16);element.style.setProperty('--chat-available',available+'px');element.classList.toggle('chat-compact',available<300)};
  fit();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(fit);observer?.observe(felt);observer?.observe(seat);window.addEventListener('resize',fit);return()=>{observer?.disconnect();window.removeEventListener('resize',fit)};
 },[open,blocked,inline]);
 async function send(text:string,kind='text',id=crypto.randomUUID()){
  text=text.trim();if(!text||locked.current)return;if(Array.from(text).length>100){setError('最多发送 100 字');return}if(Date.now()-lastSent.current<1000){setError('稍等一秒再发送');return}
  locked.current=true;setSending(true);setError('');setRetry(null);follow.current=true;
  try{const data=await tableRequest('/api/table',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'chat',code:room.code,text,kind,clientId:id})});onUpdate(data);lastSent.current=Date.now();if(kind==='text')setDraft(current=>current.trim()===text?'':current);}
  catch(e){setError(e instanceof Error?e.message:'消息发送失败，请重试');setRetry({text,kind,id});}
  finally{locked.current=false;setSending(false)}
 }
 const panelId='room-chat-'+room.code;
 const toggle=inline?null:<button className="chat-toggle" disabled={blocked} aria-label="打开互动与聊天" aria-expanded={open&&!blocked} onClick={()=>{follow.current=true;setOpen(!open)}}><MessageCircle size={17}/>互动{unread>0&&!open&&<b>{unread>99?'99+':unread}</b>}</button>;
 return <div className={inline?"chat-controls settlement-chat-controls":"chat-controls"}>{renderHeader?renderHeader(toggle):toggle}
 {expanded&&!blocked&&<section ref={panel} className={"chat-panel chat-panel-v38"+(inline?" settlement-chat-panel":"")} aria-label="房间互动与聊天"><div className="chat-panel-heading"><strong>互动与聊天</strong><label><input type="checkbox" checked={bubbles} onChange={e=>{setBubbles(e.target.checked);onBubbles(e.target.checked)}}/>桌面气泡</label>{!inline&&<button aria-label="关闭聊天" onClick={()=>setOpen(false)}><X size={18}/></button>}</div>
 <div className="chat-history" ref={scroll} role="log" aria-label="房间聊天记录" aria-live="polite" aria-relevant="additions" onScroll={()=>{const n=scroll.current;if(n)follow.current=n.scrollHeight-n.scrollTop-n.clientHeight<40}}>{messages.length?messages.map(m=><div key={m.id} className={'chat-message '+(m.mine?'mine':'')+(m.kind==='interaction'?' interaction-message':'')}><small><strong>{m.name}</strong>{m.mine?'（你）':''} · <time dateTime={new Date(m.at).toISOString()}>{new Date(m.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time></small><p>{m.kind==='interaction'&&m.effect?<><strong>{m.name}</strong> 向 <strong>{m.targetName??'当时的牌友'}</strong> {interactionAction(m.effect)} <span aria-hidden="true">{INTERACTIONS.find(e=>e.id===m.effect)?.emoji}</span></>:m.content}</p></div>):<p className="chat-empty">文字、Emoji和定向互动都会记录在这里。</p>}</div>
 <div className="chat-tabs" role="tablist" aria-label="互动方式">{([['interaction','互动表情'],['emoji','Emoji'],['text','文字']] as const).map(([id,label])=><button key={id} role="tab" id={panelId+'-'+id} aria-selected={tab===id} aria-controls={panelId+'-content'} onClick={()=>setTab(id)}>{label}</button>)}</div>
 <div className="chat-compose" role="tabpanel" id={panelId+'-content'} aria-labelledby={panelId+'-'+tab}>
 {tab==='interaction'&&(onPick?<><div className="target-effects">{INTERACTIONS.map(effect=><button key={effect.id} aria-label={effect.name} onClick={()=>{onPick(effect.id);if(!inline)setOpen(false)}}><InteractionArtwork kind={effect.id}/><span className="effect-name">{effect.name}</span></button>)}</div><p className="interaction-help">选一个互动，再点对方头像 · 间隔 3 秒</p></>:<p className="chat-empty">这张牌桌暂不支持定向互动。</p>)}
 {tab==='emoji'&&<div className="chat-emojis">{CHAT_EMOJIS.map(emoji=><button key={emoji} disabled={sending} aria-label={'发送表情 '+emoji} onClick={()=>void send(emoji,'emoji')}>{emoji}</button>)}</div>}
 {tab==='text'&&<><div className="chat-quick" aria-label="预设文字消息">{QUICK_MESSAGES.map(text=><button key={text} disabled={sending} onClick={()=>void send(text)}>{text}</button>)}</div><form onSubmit={e=>{e.preventDefault();void send(draft)}}><input aria-label="聊天消息" placeholder="说点什么，最多 100 字" value={draft} onChange={e=>setDraft(Array.from(e.target.value).slice(0,100).join(''))} onKeyDown={e=>{if(e.key==='Enter'&&(e.nativeEvent.isComposing||e.keyCode===229))e.preventDefault()}}/><button type="submit" disabled={sending||!draft.trim()}><Send size={16}/>{sending?'发送中':'发送'}</button></form></>}
 </div>{error&&<div className="chat-error" role="alert">{error}{retry&&<button disabled={sending} onClick={()=>void send(retry.text,retry.kind,retry.id)}>重试</button>}</div>}</section>}</div>
}
export function ReadySummary({room}:{room:any}){
 const r=room.result;
 return <section className="ready-summary" aria-label="本局听牌与胡牌情况"><h3>听牌与胡牌</h3><p>按本局结束时的牌判断，听牌不是“准备下一局”。</p><div className="ready-summary-list">{room.players.map((p:any,i:number)=>{
  const won=i===r.winner,info=r.readyInfo?.[i],tiles=info?.waits??r.waitTiles?.[i]?.map((tile:number)=>({tile,discard:null})),ready=won?true:(info?.ready??r.revealed?.[i]??(Array.isArray(tiles)?tiles.length>0:undefined)??(p.revealed?true:undefined)),status=won?'已胡牌':ready===undefined?'未记录听牌状态':ready?'已听牌':'未听牌';
  return <div key={i} className={i===room.me?'ready-summary-mine':''}><div className="ready-summary-heading"><strong>{p.name}{i===room.me?'（你）':''}</strong><b className={won?'ready-winner':ready?'ready-yes':'ready-no'}>{status}</b></div>{won?<p>{r.kind} · {r.pattern??'牌型未记录'}{r.winningTile!=null&&<> · 胡 <DetailTile tile={r.winningTile}/><span>{tileName(r.winningTile)}</span></>}</p>:ready?<div className="waiting-tile-list">{tiles?.length?tiles.map((w:any)=><span className="waiting-tile" key={w.tile}><DetailTile tile={w.tile}/><span>{tileName(w.tile)}</span><small>{w.discard===true?'接炮／自摸':w.discard===false?'仅自摸':'听牌'}</small></span>):<p>这局未记录具体听牌牌面。</p>}</div>:<p>{ready===undefined?'以当时保存的账单为准。':'没有能组成胡牌的待进牌。'}</p>}{r.burned?.[i]?<p className="ready-qualification">放热炮 · 自己的鸡豆烧掉</p>:r.winner<0?<p className="ready-qualification">{r.terminated?'房主终止 · 本局不加扣分':r.checkReady?'流局 · 只结算查叫，鸡豆与责任鸡不计分':'流局 · 本局不加扣分'}</p>:ready&&<p className="ready-qualification">有收鸡、收豆资格</p>}</div>;
 })}</div></section>;
}
export function ScoreOverview({room}:{room:any}){
 const result=room.result,showCheck=!!result.checkReady&&result.winner<0&&!result.terminated,showResponsibility=!!result.responsibilityAudit?.length;
 return <><FlipSummary room={room}/><SettlementHeadline room={room}/>{result.huParts?.length>0&&<p className="hu-breakdown">{result.huParts.map((p:any)=>`${p.name} ${p.points}`).join(' ＋ ')} ＝ {result.huValues[result.winner]} 分。{result.from<0?`三家各付 ${result.huPayable} 分。`:`${room.players[result.from].name}付 ${result.huPayable} 分。`}{result.hotPenalty>0&&`其中热炮额外 ${result.hotPenalty} 分；放炮者自己的鸡豆全部烧掉。`}</p>}<div className="bill-table-scroll" tabIndex={0} aria-label="四人分值总览，可左右滚动"><table className="score-overview"><thead><tr><th>牌友</th><th>胡</th><th>豆</th><th>鸡</th>{showCheck&&<th>查叫</th>}{showResponsibility&&<th>责任鸡净额</th>}<th>合计</th></tr></thead><tbody>{room.players.map((p:any,i:number)=>{
  const hu=result.huValues?.[i]??(i===result.winner?result.hu[i]/(result.from<0?3:1):0);
  const bean=result.beanValues?.[i]??(p.melds.some((m:any)=>m.k==='gang')?null:0);
  const net=result.delta[i];return <tr key={i} className={i===room.me?'your-score':''}><td>{p.name}{i===room.me&&<small>你</small>}{result.burned?.[i]&&<small>热炮烧鸡豆</small>}</td><td>{hu}</td><td>{bean===null?'—':bean}</td><td>{result.values?.[i]??0}</td>{showCheck&&<td>{result.checkReady.scores[i]?.points??0}</td>}{showResponsibility&&<td>{signed(result.responsibility?.[i]??0)}</td>}<td className={net>0?'positive':net<0?'negative':''}><b>{net>0?'+':''}{net}</b></td></tr>
 })}</tbody></table></div><p className="score-caption">胡、豆、鸡是自身分值；合计是本局实际盈亏。{showCheck&&'查叫列为听牌者最高牌型分，实际收付另列。'}{showResponsibility&&'责任鸡列为实际净收付，已包含在合计中。'}{result.scoringVersion===3?'胡列为牌型分，热炮额外付款计入实际收付。只有胡牌或听牌且未放热炮者收鸡豆；其余人仍须支付有效鸡豆。':result.beanRequiresReady&&'自己的豆仅在胡牌或听牌时有效；未听牌仍需付他人的有效豆分。'}{!result.beanValues&&'历史杠分基数未记录，以合计为准。'}</p><ReadySummary room={room}/></>;
}
const signed=(n:number)=>(n>0?'+':'')+n;
const moneyClass=(n:number)=>n>0?'money-in':n<0?'money-out':'money-zero';
export function SettlementHeadline({room}:{room:any}){
 const r=room.result,me=room.me,net=r.delta[me]??0;
 const ledger=settlementLedger(room);
 return <section className={'settlement-headline '+moneyClass(net)} aria-label="我的本局实际盈亏"><span>你的本局实际盈亏</span><strong>{r.terminated?'房主终止 · 0 分':r.winner<0&&!r.checkReady?'流局 · 0 分':net>0?`赚了 ${net} 分`:net<0?`亏了 ${-net} 分`:'收支持平 · 0 分'}</strong>{ledger.complete?<div className="gross-totals"><span>收到合计 <b className="money-in">{ledger.received} 分</b></span><span>扣分合计 <b className="money-out">{ledger.paid} 分</b></span></div>:<p className="detail-note">旧账单未记录完整收付合计，实际盈亏仍按原结果显示。</p>}<div className="net-parts">{[['胡',r.hu?.[me]],['豆',r.beans?.[me]],['鸡',r.chicken?.[me]],...(r.checkReady&&r.winner<0&&!r.terminated?[['查叫',r.check?.[me]]]:[]),...(r.responsibilityAudit?.length?[['责任鸡',r.responsibility?.[me]]]:[])].map(([label,n])=><span key={label as string}>{label}净额 <b className={moneyClass(Number(n??0))}>{signed(Number(n??0))}</b></span>)}</div></section>;
}
export function FlipSummary({room}:{room:any}){
 const r=room.result;
 return <section className="settlement-flip" aria-label="本局翻鸡"><h3>本局翻鸡</h3>{r.winner<0||r.terminated?<p>本局不翻鸡{r.terminated?' · 房主终止':' · 流局'}</p>:r.flip==null?<p>本局没有翻出牌{r.flip===undefined?' · 旧账单未记录':' · 牌墙没有剩余牌'}</p>:<div className="settlement-flip-tiles"><span><small>翻出的牌</small><DetailTile tile={r.flip}/><b>{tileName(r.flip)}</b></span><span className="flip-summary-arrow" aria-hidden="true">→</span>{r.rooster==null?<p>旧账单未记录翻鸡牌</p>:<span><small>本局翻鸡牌</small><DetailTile tile={r.rooster}/><b>{tileName(r.rooster)}</b></span>}</div>}{r.winner>=0&&r.flip!=null&&r.rooster!=null&&<p>翻出 {tileName(r.flip)} → {tileName(r.rooster)}是翻鸡牌，按本局规则每张加 {(r.rules??room.roundRules??defaultRules()).flip} 分；与固定鸡重合时叠加。</p>}</section>;
}
function DetailTile({tile}:{tile:number|null}){return <span className={'settlement-tile '+(tile===null?'concealed-detail':'')} aria-label={tile===null?'暗杠牌背':tileName(tile)}>{tile===null?<span>◆</span>:<img src={`/tiles/${tile}.webp`} alt={tileName(tile)} draggable={false}/>}</span>}
function huWith(result:any,me:number,other:number){
 if(result.winner<0)return 0;
 const n=result.huPayable??result.huValues?.[result.winner]??result.hu[result.winner]/(result.from<0?3:1);
 if(me===result.winner)return result.from<0||result.from===other?n:0;
 if(other===result.winner)return result.from<0||result.from===me?-n:0;
 return 0;
}
export function AdditionalSettlement({room}:{room:any}){
 const r=room.result,me=room.me,name=(i:number)=>room.players[i]?.name??'牌友';
 return <>{r.checkReady&&r.winner<0&&!r.terminated&&<section className="bill-section check-ready-section"><h3>流局查叫 <b>{signed(r.check?.[me]??0)} 分</b></h3><p>每位未听牌者分别支付每位听牌者的最高牌型分；只结算查叫，不翻鸡，不计鸡、豆和责任鸡。</p>{r.checkReady.scores.map((score:any,i:number)=><p key={i}>{name(i)}：{score?<>{score.parts.map((p:any)=>`${p.name} ${p.points}`).join(' ＋ ')} ＝ {score.points} 分，最高分可进 <DetailTile tile={score.tile}/> {tileName(score.tile)}。</>:'未听牌，没有查叫收入。'}</p>)}{r.checkReady.transfers.filter((t:any)=>t.from===me||t.to===me).map((t:any,i:number)=><p key={i}>{name(t.from)}给{name(t.to)} <b>{t.points} 分</b>。</p>)}{!r.checkReady.transfers.length&&<p>全桌都听牌或全桌都未听牌，或应付牌型分为0，没有实际查叫收付。</p>}</section>}
 {r.responsibilityAudit?.length>0&&<section className="bill-section responsibility-section"><h3>冲锋鸡被碰／杠的责任鸡 <b>{signed(r.responsibility?.[me]??0)} 分</b></h3><p>额外收付独立于普通鸡分，不重复计算。碰／杠者最终听牌或胡牌则收取，未听牌则倒付；原出牌者热炮不取消；流局或终止取消。</p>{r.responsibilityAudit.filter((e:any)=>e.from===me||e.to===me).map((e:any,i:number)=><div key={i}><p>{name(e.to)}{e.kind==='peng'?'碰':'杠'}了{name(e.from)}的冲锋鸡 <DetailTile tile={e.tile}/> {tileName(e.tile)}。</p><p>{e.status==='drawn'?'本局流局或终止，这项取消，0 分。':<>{e.status==='reverse'?'碰／杠者没听牌，倒付：':'碰／杠者听牌或胡牌：'}{name(e.payer)}给{name(e.receiver)} <b>{e.unit} 分</b>。</>}</p></div>)}</section>}</>;
}
export function DeductionSummary({room}:{room:any}){
 const ledger=settlementLedger(room),rows=ledger.items.filter(t=>t.from===room.me);
 return <section className="deduction-summary bill-section"><h3>本局扣分明细{ledger.complete&&<b className="money-out">合计 {ledger.paid} 分</b>}</h3><p className="detail-note">每笔扣分就是付给对应牌友的分数，不另扣一次。收到与扣分按各项抵扣前列出，两者相减才是实际盈亏。</p>{rows.length?<div className="bill-table-scroll"><table className="deduction-table"><thead><tr><th>扣分原因</th><th>付给谁</th><th>扣多少</th></tr></thead><tbody>{rows.map((t,i)=><tr key={i}><td>{t.reason}</td><td>{room.players[t.to]?.name}</td><td className="money-out">−{t.points} 分</td></tr>)}</tbody></table></div>:<p>{ledger.complete?'本局没有扣分。':'已记录项目中没有扣分；较早豆分来源缺失，不推测未记录的扣分。'}</p>}{ledger.complete&&<p className="net-equation">收到 {ledger.received} − 扣分 {ledger.paid} ＝ 实际 <b>{signed(room.result.delta[room.me])} 分</b></p>}</section>;
}
export function SettlementDetails({room,defaultOpen=false}:{room:any,defaultOpen?:boolean}){
 const r=room.result,me=room.me,showCheck=!!r.checkReady&&r.winner<0&&!r.terminated,showResponsibility=!!r.responsibilityAudit?.length,details=r.myChickenDetails,cfg=r.rules??defaultRules();
 const eligible=r.eligible?.[me]??(me===r.winner||r.revealed?.[me]),modern=r.scoringVersion===3,burned=r.burned?.[me];
 const sources:Record<string,string>={hand:'手牌',peng:'碰牌',gang:'明杠／补杠',an:'暗杠',river:'自己打出的牌'};
 const rows=room.players.map((p:any,i:number)=>{
  const hu=huWith(r,me,i),chicken=r.winner<0?0:Array.isArray(r.chickenTransfers)?r.chickenTransfers.reduce((sum:number,t:any)=>sum+(t.from===i&&t.to===me?t.points:0)-(t.from===me&&t.to===i?t.points:0),0):(r.values?.[me]??0)-(r.values?.[i]??0);
  const bean=r.winner<0?0:Array.isArray(r.beanTransfers)?r.beanTransfers.reduce((sum:number,t:any)=>sum+(t.from===i&&t.to===me?t.points:0)-(t.from===me&&t.to===i?t.points:0),0):null;
  const pair=(list:any[])=>list.reduce((n:number,t:any)=>n+(t.from===i&&t.to===me?t.points:0)-(t.from===me&&t.to===i?t.points:0),0),check=pair(r.checkReady?.transfers??[]),responsibility=pair(r.responsibilityTransfers??[]);
  return {name:p.name,i,hu,chicken,bean,check,responsibility,total:bean===null?null:hu+chicken+bean+check+responsibility};
 }).filter((row:any)=>row.i!==me);
 const name=(i:number)=>i===me?'你':room.players[i]?.name??'牌友';
 const audit=r.myChickenAudit??details?.map((d:any)=>({...d,status:'counted',actual:r.winner<0?0:eligible?d.points:-d.points}));
 const beanEvents=r.beanAudit?.filter((e:any)=>e.seat===me||e.payers.includes(me));
 const reason=(d:any)=>d.status==='drawn'?(r.terminated?'房主终止：本局鸡分全部取消':'流局：本局鸡分全部取消'):d.status==='burned'?'热炮：自己的鸡豆全部烧掉':d.status==='notReady'?'未听牌：持有鸡不收分，也不罚分':d.status==='flipExempt'?'未听牌：这张只是翻鸡、未与固定鸡重合，不收分也不扣分':d.status==='claimed'?`被${name(d.to)}${({peng:'碰',gang:'杠',hu:'胡'} as Record<string,string>)[d.kind]??'取'}走，不再算你的弃牌鸡；接牌者按持有牌计分。`:eligible?'有收分资格：这组鸡向其余三家各收对应分值。':modern?'未听牌弃牌鸡：只赔胡牌／听牌且未放热炮者。':'未听牌弃牌鸡：按本局旧规则向三家支付。';
 const pairChicken=(i:number)=>{
  if(r.winner<0)return [r.terminated?'房主终止，双方鸡分收付为 0。':'流局，双方鸡分收付为 0。'];
  if(!modern)return [`按本局旧规则，你的鸡值 ${r.values?.[me]??0} − 对方鸡值（${r.values?.[i]??0}）。`];
  const mine=Number(r.values?.[me]??0),other=Number(r.values?.[i]??0),mineEligible=!!r.eligible?.[me],otherEligible=!!r.eligible?.[i];
  const incoming=mineEligible?Math.max(0,mine)+Math.max(0,-other):0,outgoing=otherEligible?Math.max(0,other)+Math.max(0,-mine):0;
  const lines:string[]=[];
  if(mineEligible&&mine>0)lines.push(`对方给你：你的鸡 ${mine} 分。`);
  if(mineEligible&&other<0)lines.push(`对方给你：对方未听牌的弃牌鸡 ${-other} 分。`);
  if(otherEligible&&other>0)lines.push(`你给对方：对方的鸡 ${other} 分。`);
  if(otherEligible&&mine<0)lines.push(`你给对方：你未听牌的弃牌鸡 ${-mine} 分。`);
  if(!mineEligible&&!otherEligible)lines.push('双方都没有收鸡资格，互不收弃牌鸡罚分。');
  if(r.burned?.[me]||r.burned?.[i])lines.push('热炮者自己的鸡已烧掉，不收分，也不为自己的弃牌鸡倒付。');
  lines.push(`鸡分抵扣：收到 ${incoming} − 付出 ${outgoing} ＝ ${signed(incoming-outgoing)} 分。`);return lines;
 };
 return <details className="settlement-details" open={defaultOpen}><summary>查看我的收付明细</summary><div className="settlement-body">
 <DeductionSummary room={room}/><AdditionalSettlement room={room}/>
 <p>{r.rules&&<>本局使用第 {r.ruleRevision??1} 版规则。 </>}{r.winner<0?(r.terminated?'房主终止，本局所有收付为 0；保留此前累计积分。':r.checkReady?'流局只结算查叫分：未听牌者向每位听牌者支付其最高牌型分；鸡、豆与责任鸡为 0。':'流局，本局所有收付为 0。'):burned?'你放了热炮：自己的手牌、碰杠、弃牌鸡和豆全部烧掉，不收分，也不为自己的弃牌鸡倒付；仍须支付其他有资格玩家的鸡豆。':eligible?'你已胡牌或听牌：手牌、碰杠和自己弃牌区的鸡都计分。':modern?(r.flipPenaltyOnlyFixed?'你未听牌：只有自己打出的固定鸡或重合翻鸡需要赔有收分资格者；只算翻鸡的弃牌不加分、不扣分。持有鸡和自己的豆不计分，仍付他人的有效鸡豆。':'你未听牌：自己的弃牌鸡只向胡牌或听牌且未放热炮的人付分，不收其他人的弃牌鸡罚分；手牌及碰杠里的鸡不罚分。'):'你未听牌：只为自己弃牌区的鸡付分，手牌及碰杠里的鸡不罚分。'}{r.winner>=0&&r.beanRequiresReady&&!burned&&(eligible?'你的杠计豆，仍需支付其他胡牌或听牌者的豆分。':'你自己的杠不计豆，但仍需支付胡牌或听牌者的豆分。')}</p>
 <section className="bill-section"><h3>① 胡牌分怎么收付 <b className={moneyClass(r.hu?.[me]??0)}>{signed(r.hu?.[me]??0)}</b></h3>
 {r.winner<0?<p>没有人胡牌，胡分为 0。</p>:<><p>{name(r.winner)}{r.kind}。{r.huParts?.length>0?r.huParts.map((p:any)=>`${p.name} ${p.points}`).join(' ＋ '):r.pattern} ＝ {r.huValues?.[r.winner]??Math.abs(huWith(r,r.winner,r.from<0?(r.winner+1)%4:r.from))} 分。</p>{r.hotPenalty>0&&<p className="hot-bill">牌型 {r.huValues[r.winner]} ＋ 热炮额外 {r.hotPenalty} ＝ {r.huPayable} 分，由{name(r.from)}支付；放炮者自己的鸡豆烧掉。</p>}<p>{r.from<0?`自摸：${room.players.map((_:any,i:number)=>i).filter((i:number)=>i!==r.winner).map(name).join('、')}各付 ${r.huPayable??r.huValues?.[r.winner]??Math.abs(r.hu[r.winner])/3} 分。`:`只有${name(r.from)}付胡分，另外两家不付这一项。`}</p><ul className="hu-transfer-list">{rows.map((row:any)=><li key={row.i}><span>{row.hu>0?`${row.name}给你`:row.hu<0?`你给${row.name}`:`你与${row.name}无胡分收付`}</span><b className={moneyClass(row.hu)}>{signed(row.hu)} 分</b></li>)}</ul></>}
 </section>
 <section className="bill-section"><h3>② 自己的鸡分：{r.values?.[me]??0}</h3><p className="detail-note">这是自己的鸡值；下面逐家抵扣后的鸡净额是 {signed(r.chicken?.[me]??0)} 分。灰色项目不计入鸡值。</p>
 {audit===null||audit===undefined?<p className="detail-note">这局未记录逐张鸡分来源；以下收付按已保存的结算结果显示。</p>:audit.length?<ul className="chicken-detail-list">{audit.map((d:any,i:number)=><li key={i} className={d.status!=='counted'?'bill-canceled':''}><div className="chicken-source"><div className="settlement-tiles">{Array.from({length:Math.min(d.count,4)},(_,j)=><DetailTile key={j} tile={d.tile}/>)}</div><span>{sources[d.source]} · {tileName(d.tile)}{d.charge?'（冲锋鸡）':''}{d.tile===r.rooster?(d.status==='flipExempt'?'（翻鸡免计）':`（含翻牌鸡 +${cfg.flip}）`):''}<small>{d.count} 张 × {d.unit} 分</small><small>{d.charge?`冲锋鸡 ${cfg.charge}`:isChicken(d.tile,cfg)?`固定鸡 ${cfg.chicken}`:`翻牌鸡 ${cfg.flip}`}{d.tile===r.rooster&&(d.charge||isChicken(d.tile,cfg))?` ＋ 翻牌鸡 ${cfg.flip}`:''} ＝ 每张 {d.unit} 分</small><p>{reason(d)}</p></span></div><b className={moneyClass(d.actual)}>{d.actual>0?'+':''}{d.actual} 分{d.status!=='counted'&&<small>已取消</small>}</b></li>)}</ul>:<p className="detail-note">没有计入鸡分的牌。</p>}
 {!r.claimedAuditComplete&&<p className="detail-note">这局较早的弃牌被碰／杠／胡走记录可能未保存；已有鸡分与实际盈亏不重算。</p>}</section>
 <section className="bill-section"><h3>③ 每次杠的豆分 <b className={moneyClass(r.beans?.[me]??0)}>{signed(r.beans?.[me]??0)}</b></h3><p className="detail-note">自身豆值 {r.beanValues?.[me]??'未记录'}；实际豆净额 {signed(r.beans?.[me]??0)} 分。</p>
 {beanEvents?.length>0?<ul className="bean-event-list">{beanEvents.map((e:any,i:number)=>{const valid=e.status==='counted',n=valid?(e.seat===me?e.unit*e.payers.length:-e.unit):0;return <li key={i} className={!valid?'bill-canceled':''}><div className="bean-event-heading"><DetailTile tile={e.tile}/><strong>{name(e.seat)}的{({ming:'明杠',an:'暗杠',bu:'补杠'} as Record<string,string>)[e.type]}</strong><b className={moneyClass(n)}>{signed(n)} 分</b></div><p>{e.seat===me?`${e.payers.map(name).join('、')}各付 ${e.unit} 分，原定合计 ${e.unit*e.payers.length} 分。`:`原定由${e.payers.map(name).join('、')}各给${name(e.seat)} ${e.unit} 分；你这一项原定付 ${e.unit} 分。`}</p><p>{valid?(e.seat===me?'胡牌／听牌资格有效，这次豆正常收分。':'对方具备收豆资格，你是否听牌都需支付。'):e.status==='robbed'?'补杠被抢胡：没有完成开杠，这次豆为 0。':e.status==='drawn'?(r.terminated?'房主终止：这次豆全部取消。':'流局：这次豆全部取消。'):e.status==='burned'?'热炮：杠牌者自己的豆烧掉，这次豆全部取消。':'杠牌者最终未听牌：这次豆全部取消，不反向罚自己的豆。'}</p></li>})}</ul>:<p className="detail-note">{r.beanAuditComplete?'本局没有与你有关的开杠。':'这局未完整记录逐次杠的来源；按下方已保存的逐家豆收付核对。'}</p>}
 {!r.beanAuditComplete&&beanEvents?.length>0&&<p className="detail-note">逐次开杠记录从更新后开始保存，较早开杠可能缺项；实际豆净额与逐家账本仍保留。</p>}</section>
 <h3>与每家的收付</h3><p className="detail-note">正数是对方给你，负数是你给对方。{modern?'鸡分按收分资格逐家计算；热炮额外付款包含在实际胡分收付内。':'鸡分按双方自身鸡值相减。'}</p>
 <div className="bill-table-scroll" tabIndex={0} aria-label="与每家的收付，可左右滚动"><table className="transfer-table"><thead><tr><th>牌友</th><th>胡</th><th>豆</th><th>鸡</th>{showCheck&&<th>查叫</th>}{showResponsibility&&<th>责任鸡</th>}<th>合计</th></tr></thead><tbody>{rows.map((row:any)=><tr key={row.i}><td>{row.name}<small>{modern?(r.burned?.[row.i]?'热炮 · 鸡豆烧掉':r.eligible?.[row.i]?'胡牌／听牌 · 可收鸡豆':'未听牌 · 不收鸡豆'):<>鸡：{r.values?.[me]??0} − ({r.values?.[row.i]??0})</>}</small></td><td className={moneyClass(row.hu)}>{signed(row.hu)}</td><td className={moneyClass(row.bean??0)}>{row.bean===null?'—':signed(row.bean)}</td><td className={moneyClass(row.chicken)}>{signed(row.chicken)}</td>{showCheck&&<td className={moneyClass(row.check)}>{signed(row.check)}</td>}{showResponsibility&&<td className={moneyClass(row.responsibility)}>{signed(row.responsibility)}</td>}<td className={moneyClass(row.total??0)}>{row.total===null?'—':signed(row.total)}</td></tr>)}</tbody><tfoot><tr><th>实际总收付</th>{[r.hu?.[me]??0,r.beans?.[me]??0,r.chicken?.[me]??0,...(showCheck?[r.check?.[me]??0]:[]),...(showResponsibility?[r.responsibility?.[me]??0]:[]),r.delta[me]].map((n:number,i:number)=><td key={i} className={moneyClass(n)}><b>{signed(n)}</b></td>)}</tr></tfoot></table></div>
 {rows.some((row:any)=>row.bean===null)&&<p className="detail-note">这局开局时尚未记录逐家豆分，豆的实际净额仍保留在下面。</p>}
 <div className="opponent-bills">{rows.map((row:any)=><details className="opponent-bill" key={row.i}><summary><span>与{row.name}的计算过程</span><b className={moneyClass(row.total??0)}>{row.total===null?'部分未记录':signed(row.total)+' 分'}</b></summary><div><p>胡分：{row.hu>0?`对方给你 ${row.hu} 分。`:row.hu<0?`你给对方 ${-row.hu} 分。`:'这家没有胡分收付。'}</p><p>豆分：{row.bean===null?'未记录逐家来源。':row.bean>0?`对方给你的有效豆抵扣后为 ${row.bean} 分。`:row.bean<0?`你给对方的有效豆抵扣后为 ${-row.bean} 分。`:'有效豆相互抵扣后为 0 分。'}</p>{showCheck&&<p>查叫：{signed(row.check)} 分，按对方或你的最高牌型计算。</p>}{showResponsibility&&<p>责任鸡：{signed(row.responsibility)} 分，碰／杠者听牌时收取，没听牌时倒付；原出牌者热炮不取消。</p>}{pairChicken(row.i).map((line,j)=><p key={j}>{line}</p>)}<p className="pair-equation">胡 {signed(row.hu)} ＋ 豆 {row.bean===null?'未记录':signed(row.bean)} ＋ 鸡 {signed(row.chicken)}{showCheck&&` ＋ 查叫 ${signed(row.check)}`}{showResponsibility&&` ＋ 责任鸡 ${signed(row.responsibility)}`} ＝ <b>{row.total===null?'部分未记录':signed(row.total)+' 分'}</b></p></div></details>)}</div>
 <p className="net-equation">实际盈亏：胡 {signed(r.hu?.[me]??0)} ＋ 豆 {signed(r.beans?.[me]??0)} ＋ 鸡 {signed(r.chicken?.[me]??0)}{showCheck&&` ＋ 查叫 ${signed(r.check?.[me]??0)}`}{showResponsibility&&` ＋ 责任鸡 ${signed(r.responsibility?.[me]??0)}`} ＝ <b>{signed(r.delta[me])}</b></p>
 </div></details>;
}
function BillTile({t,back}:{t:number,back?:boolean}){return <DetailTile tile={back||t<0?null:t}/>}
export function Showdown({room,Tile=BillTile}:{room:any,Tile?:any}){return <section className="showdown"><h3>胡牌 / 听牌亮牌</h3>{room.players.map((p:any,i:number)=>p.revealed&&<div className="showdown-player" key={i}><label>{p.name}<b>{room.result.winner===i?'胡牌':'听牌'}</b></label><div className="showdown-tiles">{p.melds.map((m:any,j:number)=><span className="showdown-meld" key={j}>{Array.from({length:m.k==='gang'?4:3},(_,k)=><Tile t={m.t} small back={!!m.hidden&&!m.faceUp||m.t<0} key={k}/>)}</span>)}{p.hand.map((t:number,j:number)=><Tile t={t} small key={j}/>)}</div>{room.result.waitTiles?.[i]?.length>0&&<small>听 {room.result.waitTiles[i].map(tileName).join('、')}</small>}</div>)}</section>}
export function RoundEnd({room,Tile,nextRound,tutorialGuide,stage='summary',onOpenChange,saveStatus,onRetrySave,interactionPanel}:{room:any,Tile:any,nextRound?:any,tutorialGuide?:any,stage?:EndStage,onOpenChange?:(open:boolean)=>void,saveStatus?:string,onRetrySave?:()=>void,interactionPanel?:(onClose:()=>void)=>ReactNode}){
 const [closed,setClosed]=useState(false),[socialOpen,setSocialOpen]=useState(false);
 const changeOpen=(open:boolean)=>{setSocialOpen(false);setClosed(!open);onOpenChange?.(open)};
 const win=room.result.winner>=0?winnerText(room):null;
 const singleAction=room.solo||(room.local&&room.lesson?.settlementStep>=4);
 const nextPanel=nextRound&&<section className={'round-next-panel'+(singleAction?' round-next-panel-single':'')} aria-label="下一局操作">{interactionPanel&&!closed?<div className="round-next-actions"><Button variant="outline" className="settlement-social-toggle" aria-expanded={socialOpen} aria-controls={'settlement-chat-'+room.code+'-'+room.round} onClick={()=>setSocialOpen(!socialOpen)}><MessageCircle size={16}/>互动</Button>{nextRound}</div>:nextRound}</section>;
 if(closed)return <div className="round-end round-end-closed"><div className="round-end-stack">{tutorialGuide}<button className="reopen-summary" onClick={()=>changeOpen(true)}>查看本局结算</button>{nextPanel}</div></div>;
 return <div className="round-end" role="region" aria-label={stage==='winner'?'本局胡牌提示':stage==='flip'?'本局翻鸡':'本局积分结算'}>
 {stage==='winner'?<div className="winner-announcement" role="status"><span className="end-kicker">本局胡牌</span><h2>{win?.title}</h2><p>{win?.detail}</p><strong>{win?.pattern}</strong><small>{room.result.flip!==null?'接下来翻鸡':'接下来结算'}</small></div>:stage==='flip'?<div className="flip-animation" role="status"><span className="end-kicker">本局翻鸡</span><div className="flip-scene"><div className="flip-card"><div className="flip-back"><Tile t={0} back/></div><div className="flip-face"><Tile t={room.result.flip}/></div></div><ChevronRight size={24}/><div className="rooster-card"><Tile t={room.result.rooster}/></div></div><p>翻出 {tileName(room.result.flip)} · {tileName(room.result.rooster)}为本局鸡</p></div>:<div className="round-end-stack"><div className="settlement-summary-frame"><div inert={socialOpen||undefined} aria-hidden={socialOpen||undefined} className={'central-summary'+(tutorialGuide?' guided-summary lesson-settlement-step-'+room.lesson.settlementStep:'')}><div className="central-summary-heading"><div><span className="end-kicker">本局积分结算</span><h2>{room.result.winner<0?(room.result.terminated?'房主已终止本局 · 不加分、不扣分':room.result.checkReady?'流局 · 查叫结算':'流局 · 不加分、不扣分'):room.players[room.result.winner].name+'胡了'}</h2></div><button onClick={()=>changeOpen(false)} aria-label="收起结算总览"><X size={20}/></button></div><p className="end-pattern">{room.result.pattern} {room.result.kind}</p>{tutorialGuide}<ScoreOverview room={room}/>{saveStatus&&<div className="account-sync-status" role="status"><span>{saveStatus}</span>{/失败|重试|等待/.test(saveStatus)&&<Button variant="outline" onClick={onRetrySave}>重试保存</Button>}</div>}<SettlementDetails room={room} defaultOpen/><Showdown room={room} Tile={Tile}/><button className="summary-dismiss" onClick={()=>changeOpen(false)}>收起总览，查看牌面</button></div>{socialOpen&&interactionPanel&&<div className="settlement-social-overlay" id={'settlement-chat-'+room.code+'-'+room.round}>{interactionPanel(()=>setSocialOpen(false))}</div>}</div>{nextPanel}</div>}
 </div>;
}
