'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
type Pending={action:'kick'|'terminate',seat?:number,name?:string,version:number,round:number};
export function HostControls({room,busy,onAction}:{room:any,busy:boolean,onAction:(action:string,seat:number|undefined,expected:{version:number,round:number})=>Promise<any>}){
 const [open,setOpen]=useState(false),[pending,setPending]=useState<Pending|null>(null);
 if(!room?.isHost||room.local||room.solo)return null;
 const playing=['play','claim'].includes(room.phase),canKick=['lobby','done'].includes(room.phase);
 const valid=pending?.action==='terminate'?playing&&pending.round===room.round:canKick&&pending?.version===room.version;
 const select=(action:'kick'|'terminate',seat?:number)=>setPending({action,seat,name:seat===undefined?undefined:room.players[seat].name,version:room.version,round:room.round});
 const close=()=>{setOpen(false);setPending(null)};
 const confirm=async()=>{if(!pending||busy||!valid)return;const request=pending;try{await onAction(request.action,request.seat,{version:request.version,round:request.round});close()}catch{setPending(null)}};
 return <><Button variant="ghost" className="table-tool" aria-label="房主管理" onClick={()=>{setPending(null);setOpen(true)}}>管理</Button><Dialog open={open} onOpenChange={value=>{setOpen(value);if(!value)setPending(null)}}><DialogContent className="host-dialog" overlayClassName="host-dialog-overlay"><DialogHeader><DialogTitle>{pending?pending.action==='terminate'?'终止本局？':`将${pending.name}移出房间？`:'房主管理'}</DialogTitle><DialogDescription>{pending?pending.action==='terminate'?'本局胡、鸡、豆全部不加分、不扣分，保留之前累计积分与账单。':'移出后该座位空出，其他玩家的累计积分及以往账单保留。':'只有房主可以终止本局；踢人只在开局前和本局结束后开放。'}</DialogDescription></DialogHeader>{pending?<>{!valid&&<p>牌桌状态已变化，请返回管理重新选择。</p>}<div className="dialog-actions"><Button variant="outline" disabled={busy} onClick={()=>setPending(null)}>返回</Button><Button className="host-danger" disabled={busy||!valid} onClick={()=>void confirm()}>{busy?'正在确认…':pending.action==='terminate'?'终止本局':'移出房间'}</Button></div></>:<div className="host-management">{playing&&<Button className="host-danger" disabled={busy} onClick={()=>select('terminate')}>终止本局</Button>}{canKick&&<div className="host-seat-list">{room.players.map((p:any,i:number)=><div key={i}><span>{p.avatar??(p.bot?'🤖':'')} {p.name}{i===room.me?'（你）':''}</span>{i!==room.me&&<Button variant="outline" disabled={busy} aria-label={'移出'+p.name} onClick={()=>select('kick',i)}>移出</Button>}</div>)}</div>}<Button variant="outline" onClick={close}>关闭</Button></div>}</DialogContent></Dialog></>;
}
