export function settlementLedger(room:any){
 const r=room.result,me=room.me,items:{from:number,to:number,points:number,reason:string}[]=[];
 const add=(from:number,to:number,points:number,reason:string)=>{if(points>0&&(from===me||to===me))items.push({from,to,points,reason})};
 if(r.winner>=0){
  const total=r.huPayable??Math.abs(r.hu?.[r.winner]??0)/(r.from<0?3:1),hot=r.hotPenalty??0;
  for(let i=0;i<room.players.length;i++)if(i!==r.winner&&(r.from<0||r.from===i)){add(i,r.winner,total-hot,r.from<0?'支付自摸胡分':r.kind==='抢杠胡'?'支付抢杠胡分':'放炮支付胡分');add(i,r.winner,hot,'热炮额外扣分')}
  if(r.beanAuditComplete&&Array.isArray(r.beanAudit)){for(const e of r.beanAudit)if(e.status==='counted')for(const payer of e.payers)add(payer,e.seat,e.unit,'支付'+({ming:'明杠',an:'暗杠',bu:'补杠'} as Record<string,string>)[e.type]+'豆分')}
  else for(const t of r.beanTransfers??[])add(t.from,t.to,t.points,'支付有效杠豆');
  for(let i=0;i<room.players.length;i++)if(i!==me){
   const mine=Number(r.values?.[me]??0),other=Number(r.values?.[i]??0),modern=r.scoringVersion===3,mineEligible=!modern||!!r.eligible?.[me],otherEligible=!modern||!!r.eligible?.[i];
   if(mineEligible){add(i,me,Math.max(0,mine),'支付你的有效鸡分');add(i,me,Math.max(0,-other),'对方未听牌弃鸡赔分')}
   if(otherEligible){add(me,i,Math.max(0,other),'支付对方的有效鸡分');add(me,i,Math.max(0,-mine),'自己未听牌弃鸡扣分')}
  }
 }
 for(const t of r.checkReady?.transfers??[])add(t.from,t.to,t.points,'流局未听牌，支付查叫分');
 for(const e of r.responsibilityAudit??[])if(e.status!=='drawn')add(e.payer,e.receiver,e.unit,e.status==='reverse'?'碰／杠冲锋鸡后未听牌，倒付责任鸡':'冲锋鸡被碰／杠，支付责任鸡');
 const received=items.filter(t=>t.to===me).reduce((n,t)=>n+t.points,0),paid=items.filter(t=>t.from===me).reduce((n,t)=>n+t.points,0);
 return {items,received,paid,complete:(r.winner<0||Array.isArray(r.beanTransfers))&&received-paid===r.delta?.[me]};
}
