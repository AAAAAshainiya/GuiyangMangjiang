'use client';
import {Button} from '@/components/ui/button';
import {tileName} from '@/lib/game';

function actionLabel(option:string,phase:string){
 const [action,tile]=option.split(':');
 return action==='hu'?(phase==='play'?'自摸':'胡'):action==='gang'?(tile===undefined?'明杠':'暗杠'):action==='bu'?'补杠':action==='peng'?'碰':'过';
}
export function TableActions({options,phase,busy,onAction,claimText,seconds}:{options:string[],phase:string,busy:boolean,onAction:(action:string,tile?:number)=>void,claimText?:string,seconds?:number}){
 const choices=options.filter(o=>o!=='discard');
 if(!['play','claim'].includes(phase)||!choices.length)return null;
 const available=[...new Set(choices.filter(o=>o!=='pass').map(o=>actionLabel(o,phase)))];
 return <section className="table-actions" aria-label="碰杠胡操作"><p>{claimText??(available.length?'可'+available.join('、'):'请选择操作')}{seconds!==undefined&&<small>请选择操作 · {seconds} 秒</small>}</p><div className="table-action-buttons">{choices.map(option=>{
  const [action,tile]=option.split(':');
  const label=actionLabel(option,phase);
  return <Button key={option} className={'action-button '+(action==='hu'?'hu-button':'')+(action==='pass'?' pass-button':'')} disabled={busy} onClick={()=>onAction(action,tile===undefined?undefined:Number(tile))}>{label}{tile!==undefined?' '+tileName(Number(tile)):''}</Button>;
 })}</div></section>;
}
