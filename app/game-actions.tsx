'use client';
import {Button} from '@/components/ui/button';
import {tileName} from '@/lib/game';

function actionLabel(option:string,phase:string,canHeavenHu=false,claimStage?:string){
 const [action,tile]=option.split(':');
 return action==='declareHeaven'?'天听':action==='pass'&&claimStage==='hu'?'不胡':action==='skipKong'?'不杠，继续出牌':action==='skipHu'?'不胡，继续出牌':action==='hu'?(phase==='play'?(canHeavenHu?'天胡':'自摸'):'胡'):action==='gang'?(tile===undefined?'明杠':'暗杠'):action==='bu'?'补杠':action==='peng'?'碰':'过';
}
export function TableActions({options,phase,busy,onAction,claimText,seconds,canHeavenHu=false,claimStage}:{options:string[],phase:string,busy:boolean,onAction:(action:string,tile?:number)=>void,claimText?:string,seconds?:number,canHeavenHu?:boolean,claimStage?:string}){
 const choices=options.filter(o=>o!=='discard');
 if(!['play','claim'].includes(phase)||!choices.length)return null;
 const available=[...new Set(choices.filter(o=>o!=='pass'&&o!=='skipHu'&&o!=='skipKong').map(o=>actionLabel(o,phase,canHeavenHu,claimStage)))];
 return <section className="table-actions" aria-label="碰杠胡操作"><p>{claimText??(available.length?'可'+available.join('、'):'请选择操作')}{claimStage==='hu'&&<small>先决定是否胡牌；全部不胡后再碰杠</small>}{seconds!==undefined&&<small>请选择操作 · {seconds} 秒</small>}</p><div className="table-action-buttons">{choices.map(option=>{
  const [action,tile]=option.split(':');
  const label=actionLabel(option,phase,canHeavenHu,claimStage);
  return <Button key={option} className={'action-button '+(action==='hu'?'hu-button':'')+(action==='pass'||action==='skipHu'||action==='skipKong'?' pass-button':'')} disabled={busy} onClick={()=>onAction(action,tile===undefined?undefined:Number(tile))}>{label}{tile!==undefined?' '+tileName(Number(tile)):''}</Button>;
 })}</div></section>;
}
