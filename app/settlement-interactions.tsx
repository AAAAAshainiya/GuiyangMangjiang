'use client';
import {useRef} from 'react';
import {ChatPanel} from './game-social';
import {PlayerAvatar} from './game-avatar';
import {InteractionLayer} from './game-interactions';
import {INTERACTIONS,type InteractionKind} from '@/lib/interaction';

// A separate grid cell keeps the bill, next-round controls and social area apart.
export function SettlementInteractions({room,targetEffect,interactionBusy,onInteract,onPick,onUpdate,onBubbles,onCancel}:{room:any,targetEffect:InteractionKind|null,interactionBusy:boolean,onInteract:(seat:number)=>Promise<void>,onPick:(effect:InteractionKind)=>void,onUpdate:(data:any)=>void,onBubbles:(enabled:boolean)=>void,onCancel:()=>void}){
 const stage=useRef<HTMLDivElement>(null);
 const seats=[room.me,...room.players.map((_:any,i:number)=>i).filter((i:number)=>i!==room.me)];
 const effect=INTERACTIONS.find(e=>e.id===targetEffect);
 return <section className="settlement-social" aria-label="结算期间互动">
  <ChatPanel room={room} inline onUpdate={onUpdate} onPick={onPick} onBubbles={onBubbles} renderHeader={toggle=><div className="settlement-avatar-stage" ref={stage}>
   <div className="settlement-avatar-list">{seats.map(i=>{const p=room.players[i];return <div className="settlement-person" key={i}>
    <div className="settlement-person-controls">{i===room.me?<><div data-avatar-seat={i} className="avatar self"><PlayerAvatar avatar={p.avatar} name={p.name}/></div>{toggle}</>:<button type="button" data-avatar-seat={i} className={'avatar'+(targetEffect?' target-avatar':'')} disabled={!targetEffect||interactionBusy} aria-label={`向${p.name}发送${effect?.name??'互动'}`} onClick={()=>void onInteract(i)}><PlayerAvatar avatar={p.avatar} name={p.name} bot={p.bot} size={22}/></button>}</div>
    <strong title={p.name}>{i===room.me?'你':p.name}</strong>
   </div>})}</div>
   <div className="settlement-interaction-hint" role="status">{targetEffect?<><span>{interactionBusy?'正在发送…':`点对方头像：${effect?.name}`}</span><button className="text-button" disabled={interactionBusy} onClick={onCancel}>取消</button></>:<span>选互动，再点牌友头像</span>}</div>
   <InteractionLayer room={room} table={stage}/>
  </div>}/>
 </section>;
}
