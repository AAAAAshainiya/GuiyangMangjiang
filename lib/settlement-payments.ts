// Frozen evidence of the transfers actually scored by the engine. Old bills are
// never rebuilt with today's rules or supplied with unrecorded tile faces.
export type PaymentCategory='hu'|'beans'|'chicken'|'check'|'responsibility';
export type SettlementPayment={from:number,to:number,points:number,category:PaymentCategory,reason:string,tiles:number[],handSeat?:number,count?:number,unit?:number,parts?:{name:string,points:number}[]};
export type CancelledPayment={owner:number,reason:string,tiles:number[],category:PaymentCategory};
export function freezeSettlementPayments(r:any){
 const paymentItems:SettlementPayment[]=[],cancelledItems:CancelledPayment[]=[];
 const add=(item:SettlementPayment)=>{if(item.points>0)paymentItems.push(item)};
 const cancel=(owner:number,category:PaymentCategory,reason:string,tiles:number[])=>cancelledItems.push({owner,category,reason,tiles});
 if(r.winner>=0&&!r.terminated){
  for(let from=0;from<4;from++)if(from!==r.winner&&(r.from<0||r.from===from)){
   add({from,to:r.winner,points:r.huValues[r.winner],category:'hu',reason:r.kind==='天胡'?'天胡胡分':r.from<0?(r.kind==='杠上开花'?'杠上开花胡分':'自摸胡分'):r.kind==='抢杠胡'?'抢杠胡分':'放炮胡分',tiles:r.winningTile==null?[]:[r.winningTile],handSeat:r.winner,parts:r.huParts??[]});
   add({from,to:r.winner,points:r.hotPenalty??0,category:'hu',reason:'热炮额外扣分；放炮者自己的鸡豆烧掉',tiles:r.winningTile==null?[]:[r.winningTile],handSeat:r.winner});
  }
  for(const e of r.beanAudit??[])if(e.status==='counted')for(const from of e.payers)add({from,to:e.seat,points:e.unit,category:'beans',reason:({ming:'明杠：被杠者支付豆分',an:'暗杠：其他三家各付豆分',bu:'补杠：其他三家各付豆分'} as Record<string,string>)[e.type],tiles:Array(4).fill(e.tile),count:1,unit:e.unit});
  for(let owner=0;owner<4;owner++)for(const d of r.chickenAudit?.[owner]??[])if(d.status==='counted'){
   const qualified=!!r.eligible?.[owner],kind=d.charge?'冲锋鸡':'鸡牌',source=({river:'自己打出',hand:'手牌中',peng:'碰牌中',gang:'杠牌中',an:'暗杠中'} as Record<string,string>)[d.source],extra=d.tile===r.rooster?'（含翻鸡加分）':'';
   for(let other=0;other<4;other++)if(other!==owner&&(qualified||r.eligible?.[other]))add({from:qualified?other:owner,to:qualified?owner:other,points:d.points,category:'chicken',reason:qualified?`听牌／胡牌，${source}的${kind}${extra}`:`未听牌，自己打出的${kind}赔分${extra}`,tiles:Array(d.count).fill(d.tile),count:d.count,unit:d.unit});
  }
 }
 for(const t of r.checkReady?.transfers??[]){const score=r.checkReady.scores[t.to];add({...t,category:'check',reason:'流局未听牌，按对方最高听牌牌型支付查叫分',tiles:score?[score.tile]:[],handSeat:t.to,parts:score?.parts??[]})}
 for(const e of r.responsibilityAudit??[])if(e.status!=='drawn')add({from:e.payer,to:e.receiver,points:e.unit,category:'responsibility',reason:e.status==='reverse'?'碰／杠冲锋鸡者未听牌，倒付原出牌者责任鸡':'冲锋鸡被碰／杠，原出牌者额外支付责任鸡',tiles:[e.tile]});
 const reasons:Record<string,string>={drawn:r.terminated?'房主终止，不计分':'流局，只结算查叫',burned:'放热炮，自己的鸡豆烧掉',notReady:'未听牌，手中鸡／自己的豆不计分',flipExempt:'未听牌，纯翻鸡弃牌不加扣分',claimed:'弃牌已被接走，归接牌者计算',robbed:'补杠被抢胡，杠未完成'};
 for(let owner=0;owner<4;owner++)for(const d of r.chickenAudit?.[owner]??[])if(d.status!=='counted')cancel(owner,'chicken',reasons[d.status]??'此项不计分',Array(d.count).fill(d.tile));
 for(const e of r.beanAudit??[])if(e.status!=='counted')cancel(e.seat,'beans',reasons[e.status]??'此项不计分',Array(4).fill(e.tile));
 for(const e of r.responsibilityAudit??[])if(e.status==='drawn')cancel(e.to,'responsibility',reasons.drawn,[e.tile]);
 return {paymentItems,cancelledItems};
}
