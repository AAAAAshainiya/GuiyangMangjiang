import type {SoundEvent} from './game-sound';
import type {TableEvent} from './table-events';
import {defaultRules,validateRules,type GameRules} from './rules.ts';
export {defaultRules,validateRules,rulesEqual,HU_FIELDS,POINT_FIELDS,type GameRules} from './rules.ts';
export type Meld={t:number,k:'peng'|'gang',hidden?:boolean,from?:number,kong?:'ming'|'an'|'bu'};
export type Player={id:string,name:string,bot:boolean,ready:boolean,seen:number,hand:number[],melds:Meld[],river:number[],score:number,avatar?:string,managed?:boolean,autoMoves?:number};
export type Claim={from:number,t:number,rob:boolean,hot?:boolean,choices:Record<string,string[]>,answers:Record<string,string>};
export type BeanTransfer={from:number,to:number,points:number};
export type ChickenDetail={tile:number,source:'hand'|'peng'|'gang'|'an'|'river',charge:boolean,count:number,unit:number,points:number};
export type BeanEvent={seat:number,type:'ming'|'an'|'bu',tile:number,payers:number[],unit:number,robbed?:boolean};
export type ClaimedTile={from:number,to:number,tile:number,charge:boolean,kind:'peng'|'gang'|'hu'};
export type Room={rules?:GameRules,roundRules?:GameRules,ruleRevision?:number,roundRuleRevision?:number,flipPenaltyOnlyFixed?:boolean,code:string,host:string,players:Player[],phase:'lobby'|'play'|'claim'|'done',wall:number[],turn:number,dealer:number,round:number,deadline:number,claim:Claim|null,drawn:number|null,drawnIndex?:number|null,canKong:boolean,afterKong:boolean,logs:string[],result:any,beans:number[],beanValues?:number[],beanTransfers?:BeanTransfer[],beanRequiresReady?:boolean,beanEvents?:BeanEvent[],beanEventsComplete?:boolean,claimedTiles?:ClaimedTile[],soundEvents?:SoundEvent[],soundSeq?:number,tableEvents?:TableEvent[],tableSeq?:number,scoringVersion?:number,heavenlyReady?:boolean[],version?:number,playVersion?:number,actionReceipts?:{id:string,player:string,signature:string,at:number,left?:boolean}[],fast?:boolean,singleOnly?:boolean,lastDiscard?:{seat:number,index:number,tile:number,seq:number}|null,discardSeq?:number,completedRounds?:number,roundSummaries?:{round:number,at:number,players:{name:string,avatar?:string,score:number}[],delta:number[],winner:number,kind:string}[],history?:{round:number,at:number,players:Player[],result:any}[],charges?:{tile:number,player:number,index:number,claimed:boolean}[]};
export const AVATARS=['🐼','🐯','🐱','🦊','🐸','🐔','🐰','🐨'];
export const CHAT_EMOJIS=['😂','👍','😭','😎','🤔','👏'];
export const tileName=(t:number)=>`${t%9+1}${['万','筒','条'][Math.floor(t/9)]}`;
export const isChicken=(t:number,rules:GameRules=defaultRules())=>rules.chickenTiles.includes(t);
export const chickenPoints=(t:number,rules:GameRules=defaultRules())=>isChicken(t,rules)?rules.chicken:0;
export const activeRules=(r:Room):GameRules=>r.roundRules??defaultRules();
export function setRoomRules(r:Room,i:number,value:unknown){
 if(r.players[i]?.id!==r.host)throw new Error('只有房主可以修改计分规则');
 if(!['lobby','done'].includes(r.phase))throw new Error('本局结束后可以修改规则，新规则从下一局生效');
 r.rules=validateRules(value);r.ruleRevision=(r.ruleRevision??1)+1;log(r,`${r.players[i].name}更新了计分规则，第 ${r.ruleRevision} 版从下一局生效`);
}
export const botDelay=(r:Room)=>r.fast?500:2000;
export function log(r:Room,s:string){r.logs=[s,...r.logs].slice(0,30)}
export function terminateRound(r:Room,i:number,now:number){
 if(r.players[i]?.id!==r.host)throw new Error('只有房主可以终止牌局');
 if(!['play','claim'].includes(r.phase))throw new Error('本局已经结束，不能终止');
 finish(r,-1,-1,'房主终止',now);
 r.drawn=null;r.drawnIndex=null;r.canKong=false;r.afterKong=false;
 log(r,`${r.players[i].name}终止了本局，本局不加分、不扣分`);
}
function sound(r:Room,kind:SoundEvent['kind'],seat:number,now:number,delayMs=0){const seq=(r.soundSeq??0)+1;r.soundSeq=seq;r.soundEvents=[...(r.soundEvents??[]),{seq,kind,seat,at:now,delayMs}].slice(-40)}
function tableEvent(r:Room,seat:number,kind:TableEvent['kind'],from:number|null,tile:number|null,now:number){const seq=r.tableSeq=(r.tableSeq??0)+1;r.tableEvents=[...(r.tableEvents??[]),{seq,seat,kind,from,tile:kind==='an'?null:tile,at:now}].slice(-40)}
const sort=(a:number[])=>a.sort((a,b)=>a-b);
const count=(a:number[],t:number)=>a.filter(x=>x===t).length;
function groups(c:number[],left:number):boolean{if(!left)return c.every(n=>!n);let i=c.findIndex(n=>n>0);if(i<0)return false;if(c[i]>=3){c[i]-=3;const ok=groups(c,left-1);c[i]+=3;if(ok)return true}if(i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;const ok=groups(c,left-1);c[i]++;c[i+1]++;c[i+2]++;if(ok)return true}return false}
export function pattern(hand:number[],melds:Meld[]=[]):{name:string,points:number}|null{
 if(hand.length!==(4-melds.length)*3+2)return null;
 const c=Array(27).fill(0);hand.forEach(t=>c[t]++);if(c.some(n=>n>4))return null;
 const seven=!melds.length&&c.every(n=>n%2===0);let normal=false,triples=false;
 for(let i=0;i<27;i++)if(c[i]>=2){c[i]-=2;if(groups(c,4-melds.length))normal=true;if(c.every(n=>n%3===0))triples=true;c[i]+=2;}
 if(!seven&&!normal)return null;
 const pure=new Set([...hand,...melds.map(m=>m.t)].map(t=>Math.floor(t/9))).size===1;
 return {name:(pure?'清一色·':'')+(seven?'七对':triples?'大对子':'平胡'),points:(seven?4:triples?2:1)*(pure?4:1)};
}
export function waits(p:Player){const owned=[...p.hand,...p.melds.flatMap(m=>Array(m.k==='gang'?4:3).fill(m.t))];return Array.from({length:27},(_,i)=>i).filter(t=>count(owned,t)<4&&pattern([...p.hand,t],p.melds))}
function winAllowed(r:Room,i:number,t:number,rob=false){const p=r.players[i],z=pattern([...p.hand,t],p.melds);return z&&(rob||z.points>1||p.melds.some(m=>m.k==='gang')||r.scoringVersion===3&&r.heavenlyReady?.[i])}
export function options(r:Room,i:number){const p=r.players[i];if(!p)return [];
 if(r.phase==='claim')return r.claim?.choices[i]&&!r.claim.answers[i]?[...r.claim.choices[i],'pass']:[];
 if(r.phase!=='play'||r.turn!==i)return [];
 // A completed shape after peng is still a discard turn, never a self-draw.
 const a=['discard'];if(r.drawn!==null&&Number.isInteger(r.drawn)&&pattern(p.hand,p.melds))a.push('hu');
 if(r.wall.length&&r.canKong){for(let t=0;t<27;t++){if(count(p.hand,t)===4)a.push('gang:'+t);if(count(p.hand,t)&&p.melds.some(m=>m.k==='peng'&&m.t===t))a.push('bu:'+t)}}return a;
}
export function player(id:string,name:string,bot=false):Player{return{id,name,bot,ready:bot,seen:Date.now(),hand:[],melds:[],river:[],score:0}}
export function create(code:string,id:string,name:string):Room{return{rules:defaultRules(),ruleRevision:1,code,host:id,players:[player(id,name)],phase:'lobby',wall:[],turn:0,dealer:0,round:0,deadline:0,claim:null,drawn:null,canKong:false,afterKong:false,logs:['牌桌已开好，等朋友入座。'],result:null,beans:[0,0,0,0],beanValues:[0,0,0,0],beanTransfers:[],beanRequiresReady:true,beanEvents:[],beanEventsComplete:true,claimedTiles:[],soundEvents:[],soundSeq:0,scoringVersion:3,singleOnly:true,fast:false,completedRounds:0,history:[],roundSummaries:[],lastDiscard:null,heavenlyReady:[],charges:[]}}
function deadline(r:Room,now:number){r.deadline=now+((r.players[r.turn]?.bot||r.players[r.turn]?.managed)?botDelay(r):45000)}
export function start(r:Room,now:number){if(r.players.length!==4||r.players.some(p=>!p.ready))throw new Error('需要四个座位全部准备，空位可以用电脑补齐');if(r.phase==='done'&&r.result)archiveRound(r,now);const firstRound=r.round===0;r.roundRules=validateRules(r.rules??defaultRules());r.roundRuleRevision=r.ruleRevision??1;r.flipPenaltyOnlyFixed=true;r.round++;r.phase='play';r.wall=Array.from({length:108},(_,i)=>Math.floor(i/4));
 for(let i=107;i>0;i--){const a=new Uint32Array(1);crypto.getRandomValues(a);const j=a[0]%(i+1);[r.wall[i],r.wall[j]]=[r.wall[j],r.wall[i]]}
 if(firstRound){const seat=new Uint32Array(1);crypto.getRandomValues(seat);r.dealer=seat[0]%4}
 r.players.forEach(p=>{p.managed=false;p.hand=sort(r.wall.splice(0,13));p.melds=[];p.river=[]});r.turn=r.dealer;r.beans=[0,0,0,0];r.beanValues=[0,0,0,0];r.beanTransfers=[];r.beanRequiresReady=true;r.beanEvents=[];r.beanEventsComplete=true;r.claimedTiles=[];r.scoringVersion=3;r.singleOnly=true;r.lastDiscard=null;r.heavenlyReady=r.players.map(p=>waits(p).length>0);r.charges=[];r.claim=null;r.result=null;r.afterKong=false;draw(r,r.turn,now);log(r,`第 ${r.round} 局开始，${r.players[r.dealer].name}坐庄`)}
function draw(r:Room,i:number,now:number,kong=false){if(!r.wall.length){finish(r,-1,-1,'流局',now);return}r.turn=i;r.phase='play';const t=r.wall.pop()!;r.players[i].hand.push(t);sort(r.players[i].hand);r.drawn=t;r.drawnIndex=r.players[i].hand.lastIndexOf(t);r.canKong=true;r.afterKong=kong;deadline(r,now);sound(r,'draw',i,now);sound(r,'turn',i,now,120)}
function transfer(a:number[],from:number,to:number,n:number){a[from]-=n;a[to]+=n}
function bean(r:Room,i:number,type:BeanEvent['type'],from:number,tile:number){const n=r.roundRules?activeRules(r)[type]:(r.scoringVersion??1)>=2?4:type==='ming'?3:type==='an'?2:1;const payers=type==='ming'?[from]:r.players.map((_,j)=>j).filter(j=>j!==i);(r.beanEvents??=[]).push({seat:i,type,tile,payers,unit:n});if(r.beanValues)r.beanValues[i]+=n;for(const j of payers){transfer(r.beans,j,i,n);r.beanTransfers?.push({from:j,to:i,points:n})}}
function chickenDetails(r:Room,i:number,eligible:boolean,rooster:number|null):ChickenDetail[]{
 const p=r.players[i],details:ChickenDetail[]=[];
 const add=(tile:number,source:ChickenDetail['source'],count=1,charge=false)=>{
  const rules=activeRules(r),base=charge?rules.charge:chickenPoints(tile,rules),flip=tile===rooster?rules.flip:0;
  const unit=base+(flip&&(!r.flipPenaltyOnlyFixed||eligible||isChicken(tile,rules))?flip:0);if(!unit)return;
  const existing=details.find(d=>d.tile===tile&&d.source===source&&d.charge===charge);
  if(existing){existing.count+=count;existing.points+=unit*count}else details.push({tile,source,charge,count,unit,points:unit*count});
 };
 // A claimed tile leaves the river and belongs only to its recipient.
 p.river.forEach((t,index)=>add(t,'river',1,(r.charges??[]).some(c=>c.player===i&&c.index===index&&!c.claimed&&c.tile===t)));
 if(eligible){p.hand.forEach(t=>add(t,'hand'));p.melds.forEach(m=>add(m.t,m.k==='peng'?'peng':m.hidden?'an':'gang',m.k==='gang'?4:3))}
 return details;
}
export type HuPart={name:string,points:number};
export function huScore(r:Room,i:number,kind:string){
 const p=r.players[i],shape=pattern(p.hand,p.melds);if(!shape)throw new Error('胡牌牌型不成立');
 const parts:HuPart[]=[],scores=activeRules(r).hu;
 if(shape.name.includes('七对')){const dragon=p.hand.some(t=>count(p.hand,t)===4);parts.push({name:dragon?'龙七对':'七对',points:dragon?scores.dragon:scores.seven})}
 else if(shape.name.includes('大对子')&&!(r.singleOnly&&p.melds.length===4&&p.hand.length===2))parts.push({name:'大对子',points:scores.peng});
 if(shape.name.includes('清一色'))parts.push({name:'清一色',points:scores.pure});
 if(kind==='杠上开花')parts.push({name:'杠开',points:scores.kong});
 if(r.heavenlyReady?.[i])parts.push({name:'天听',points:scores.heaven});
 if(p.melds.length===4&&p.hand.length===2)parts.push({name:'单吊',points:scores.single});
 if(!parts.length)parts.push({name:'平胡',points:scores.ping});
 return {name:parts.map(p=>p.name).join('·'),points:parts.reduce((n,p)=>n+p.points,0),parts};
}
function finish(r:Room,winner:number,from:number,kind:string,now:number,winningTile:number|null=null){
 const terminated=kind==='房主终止';
 const modern=r.scoringVersion===3,ready=r.players.map((p,i)=>i===winner||waits(p).length>0);
 const hot=modern&&winner>=0&&from>=0&&kind==='热炮';
 const burned=r.players.map((_,i)=>hot&&i===from),eligible=ready.map((v,i)=>v&&!burned[i]);
 // Cancel only unqualified recipients' kong receipts; all qualified payments remain.
 if(winner>=0&&(r.beanRequiresReady||modern)){
  r.beanTransfers=(r.beanTransfers??[]).filter(t=>eligible[t.to]);
  r.beans=[0,0,0,0];for(const t of r.beanTransfers)transfer(r.beans,t.from,t.to,t.points);
  r.beanValues=r.players.map((_,i)=>eligible[i]?(r.beanValues?.[i]??0):0);
 }
 if(winner<0){r.beans=[0,0,0,0];r.beanValues=[0,0,0,0];if(r.beanTransfers)r.beanTransfers=[];}
 const delta=[...r.beans],hu=[0,0,0,0],chicken=[0,0,0,0];let flip:number|null=null,rooster:number|null=null,values=[0,0,0,0];
 let pat:{name:string,points:number}|null=null,huParts:HuPart[]|null=null,huPayable=0;
 const huValues=[0,0,0,0],hotPenalty=hot?activeRules(r).hot:0,chickenTransfers:BeanTransfer[]=[];let detailValues:ChickenDetail[][]=[[],[],[],[]];
 if(winner>=0){
  if(modern){const score=huScore(r,winner,kind);pat=score;huParts=score.parts;huValues[winner]=score.points;huPayable=score.points+hotPenalty}
  else {pat=pattern(r.players[winner].hand,r.players[winner].melds)!;if(!pat)throw new Error('胡牌牌型不成立');huPayable=pat.points*(from<0&&r.scoringVersion===2?3:1)*(kind==='杠上开花'||kind==='抢杠胡'?2:1);huValues[winner]=huPayable}
  if(from<0)r.players.forEach((_,j)=>{if(j!==winner)transfer(hu,j,winner,huPayable)});else transfer(hu,from,winner,huPayable);
  flip=r.wall.length?r.wall.pop()!:null;rooster=flip===null?null:Math.floor(flip/9)*9+(flip%9+1)%9;
  detailValues=r.players.map((_,i)=>burned[i]?[]:chickenDetails(r,i,eligible[i],rooster));
  values=detailValues.map((details,i)=>details.reduce((sum,d)=>sum+d.points,0)*(eligible[i]?1:-1)).map(v=>v||0);
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
   // Non-ready discard penalties go only to qualified recipients. A hot loser
   // has zero own chicken value, but still pays everyone else's qualified value.
   const n=modern?(eligible[i]?values[i]+Math.max(0,-values[j]):0)-(eligible[j]?values[j]+Math.max(0,-values[i]):0):values[i]-values[j];
   transfer(chicken,j,i,n);
   if(n)chickenTransfers.push({from:n>0?j:i,to:n>0?i:j,points:Math.abs(n)});
  }
 }
 if(winner>=0)sound(r,from<0?'zimo':'hu',winner,now);if(flip!==null)sound(r,'flip',winner,now,2100);sound(r,'settle',winner,now,winner<0?550:flip!==null?4200:1600);
 r.players.forEach((p,i)=>{delta[i]+=hu[i]+chicken[i];p.score+=delta[i];p.ready=p.bot});
 const revealed=terminated?ready.map(()=>false):ready,waitTiles=r.players.map(p=>waits(p));
 const readyInfo=r.players.map((_,i)=>({ready:ready[i],waits:waitTiles[i].map(tile=>({tile,discard:!!winAllowed(r,i,tile),selfDraw:true}))}));
 // Explanations preserve canceled items without altering the scored ledgers.
 const chickenAudit=r.players.map((_,i)=>{
  const items=chickenDetails(r,i,true,rooster).map(d=>{const status=winner<0?'drawn':burned[i]?'burned':!eligible[i]&&d.source!=='river'?'notReady':r.flipPenaltyOnlyFixed&&!eligible[i]&&d.source==='river'&&!isChicken(d.tile,activeRules(r))?'flipExempt':'counted';return {...d,status,actual:status==='counted'?d.points*(eligible[i]?1:-1):0}});
  for(const c of r.claimedTiles??[]){if(c.from!==i)continue;const rules=activeRules(r),unit=(c.charge?rules.charge:chickenPoints(c.tile,rules))+(c.tile===rooster?rules.flip:0);if(unit)items.push({tile:c.tile,source:'river',charge:c.charge,count:1,unit,points:unit,status:'claimed',actual:0,to:c.to,kind:c.kind} as typeof items[number]);}
  return items;
 });
 const beanAudit=(r.beanEvents??[]).map(e=>({...e,status:e.robbed?'robbed':winner<0?'drawn':burned[e.seat]?'burned':(modern||r.beanRequiresReady)&&!eligible[e.seat]?'notReady':'counted'}));
 r.result={rules:validateRules(activeRules(r)),ruleRevision:r.roundRuleRevision??1,flipPenaltyOnlyFixed:!!r.flipPenaltyOnlyFixed,revealed,waitTiles,readyInfo,winningTile,winner,from,kind,pattern:pat?.name,flip,rooster,values,huValues,beanValues:r.beanValues?[...r.beanValues]:r.players.map(p=>p.melds.some(m=>m.k==='gang')?null:0),beanTransfers:r.beanTransfers?[...r.beanTransfers]:null,beanRequiresReady:r.beanRequiresReady??false,chickenDetails:detailValues,chickenAudit,beanAudit,detailVersion:1,beanAuditComplete:r.beanEventsComplete??false,claimedAuditComplete:r.beanEventsComplete??false,scoringVersion:r.scoringVersion??1,hu,chicken,beans:[...r.beans],delta,...(modern?{eligible,burned,huParts,huPayable,hotPenalty,chickenTransfers}:{})};
 if(terminated)r.result.terminated=true;
 r.phase='done';r.claim=null;r.deadline=0;r.dealer=winner>=0?winner:terminated?r.dealer:(r.dealer+1)%4;archiveRound(r,now);log(r,winner<0?(terminated?'房主终止，本局不加分、不扣分':'牌墙已摸完，本局流局'):`${r.players[winner].name} ${kind}！${pat?.name}${hot?`（热炮额外 ${hotPenalty} 分，放炮者鸡豆烧掉）`:''}`);
}
function makeClaim(r:Room,from:number,t:number,rob:boolean,now:number,hot=false){const choices:Record<string,string[]>={};r.players.forEach((p,i)=>{if(i===from)return;const a=[];if(winAllowed(r,i,t,rob))a.push('hu');if(!rob){if(count(p.hand,t)>=3&&r.wall.length)a.push('gang');if(count(p.hand,t)>=2)a.push('peng')}if(a.length)choices[i]=a});
 if(Object.keys(choices).length){r.claim={from,t,rob,hot,choices,answers:{}};r.phase='claim';r.deadline=now+15000;return true}return false;
}
function completeBu(r:Room,i:number,t:number,now:number){const p=r.players[i];p.hand.splice(p.hand.indexOf(t),1);const meld=p.melds.find(m=>m.t===t&&m.k==='peng')!;meld.k='gang';meld.kong='bu';bean(r,i,'bu',-1,t);sound(r,'gang',i,now);tableEvent(r,i,'bu',null,t,now);log(r,`${p.name}补杠 ${tileName(t)}`);r.claim=null;draw(r,i,now,true)}
function takeDiscard(r:Room,from:number,to:number,kind:ClaimedTile['kind']){const p=r.players[from],tile=p.river.at(-1)!;const charge=(r.charges??[]).some(c=>c.player===from&&c.index===p.river.length-1&&!c.claimed&&c.tile===tile);(r.claimedTiles??=[]).push({from,to,tile,charge,kind});for(const c of r.charges??[])if(c.player===from&&c.index===p.river.length-1&&!c.claimed)c.claimed=true;p.river.pop()}
function resolve(r:Room,now:number){const q=r.claim!;const order=[1,2,3].map(n=>(q.from+n)%4);const hu=order.find(i=>q.answers[i]==='hu');
 if(hu!==undefined){if(q.rob){r.players[q.from].hand.splice(r.players[q.from].hand.indexOf(q.t),1);(r.beanEvents??=[]).push({seat:q.from,type:'bu',tile:q.t,payers:r.players.map((_,j)=>j).filter(j=>j!==q.from),unit:r.roundRules?activeRules(r).bu:(r.scoringVersion??1)>=2?4:1,robbed:true})}else takeDiscard(r,q.from,hu,'hu');r.players[hu].hand.push(q.t);sort(r.players[hu].hand);finish(r,hu,q.from,q.rob?'抢杠胡':q.hot&&r.scoringVersion===3?'热炮':'接炮',now,q.t);return}
 const call=order.find(i=>['gang','peng'].includes(q.answers[i]));if(call!==undefined){const p=r.players[call];const isGang=q.answers[call]==='gang';for(let k=0;k<(isGang?3:2);k++)p.hand.splice(p.hand.indexOf(q.t),1);p.melds.push({t:q.t,k:isGang?'gang':'peng',from:q.from,...(isGang?{kong:'ming' as const}:{})});takeDiscard(r,q.from,call,isGang?'gang':'peng');r.claim=null;log(r,`${p.name}${isGang?'杠':'碰'}了${r.players[q.from].name}的${tileName(q.t)}`);tableEvent(r,call,isGang?'ming':'peng',q.from,q.t,now);sound(r,isGang?'gang':'peng',call,now);if(isGang){bean(r,call,'ming',q.from,q.t);draw(r,call,now,true)}else{r.phase='play';r.turn=call;r.drawn=null;r.drawnIndex=null;r.canKong=false;r.afterKong=false;deadline(r,now);sound(r,'turn',call,now,120)}return}
 r.claim=null;if(q.rob)completeBu(r,q.from,q.t,now);else draw(r,(q.from+1)%4,now);
}
export function act(r:Room,i:number,action:string,t:number|undefined,now:number){const p=r.players[i],opts=options(r,i);if(r.phase==='claim'){if(!opts.includes(action))throw new Error('当前不能执行这个操作');r.claim!.answers[i]=action;log(r,`${p.name}${action==='pass'?'选择过牌':'已选择响应'}`);if(Object.keys(r.claim!.choices).every(k=>r.claim!.answers[k]))resolve(r,now);return}
 if(action==='hu'&&opts.includes('hu')){finish(r,i,-1,r.afterKong?'杠上开花':'自摸',now,r.drawn);return}
 if(action==='discard'&&opts.includes('discard')&&Number.isInteger(t)&&p.hand.includes(t!)){const hot=r.scoringVersion===3&&r.afterKong;r.afterKong=false;p.hand.splice(p.hand.indexOf(t!),1);p.river.push(t!);r.lastDiscard={seat:i,index:p.river.length-1,tile:t!,seq:r.discardSeq=(r.discardSeq??0)+1};r.charges??=[];if(isChicken(t!,activeRules(r))&&!r.charges.some(c=>c.tile===t)){r.charges.push({tile:t!,player:i,index:p.river.length-1,claimed:false});log(r,`${p.name}打出冲锋鸡 ${tileName(t!)}`)}r.drawn=null;r.drawnIndex=null;r.canKong=false;log(r,`${p.name}打出 ${tileName(t!)}`);sound(r,'discard',i,now);if(!makeClaim(r,i,t!,false,now,hot))draw(r,(i+1)%4,now);return}
 if(action==='gang'&&opts.includes('gang:'+t)){p.hand=p.hand.filter(x=>x!==t);p.melds.push({t:t!,k:'gang',hidden:true,kong:'an'});tableEvent(r,i,'an',null,null,now);bean(r,i,'an',-1,t!);sound(r,'gang',i,now);log(r,`${p.name}暗杠`);draw(r,i,now,true);return}
 if(action==='bu'&&opts.includes('bu:'+t)){log(r,`${p.name}尝试补杠 ${tileName(t!)}`);if(!makeClaim(r,i,t!,true,now))completeBu(r,i,t!,now);return}
 throw new Error('牌局已经变化，请确认轮到你后再操作');
}
export function suggest(p:Player):number{let best=p.hand[0],lowest=Infinity;for(const t of [...new Set(p.hand)]){let v=(count(p.hand,t)-1)*4;for(const [d,w] of [[-2,0.9],[-1,1.7],[1,1.7],[2,0.9]])if(Math.floor((t+d)/9)===Math.floor(t/9))v+=count(p.hand,t+d)*w;if(t===18||t===0)v+=.35;if(t===16)v+=.7;v+=(t%9===0||t%9===8)?-.15:0;if(v<lowest){lowest=v;best=t}}return best}
function autoTurn(r:Room,i:number){const p=r.players[i];if(!p.bot){if(!p.managed)log(r,`${p.name}超时，已进入托管`);p.managed=true;p.autoMoves=(p.autoMoves??0)+1}}
export function tick(r:Room,now:number){let changed=false;if(r.phase==='claim'){const q=r.claim!;for(const k of Object.keys(q.choices)){if(q.answers[k])continue;const i=Number(k);if(r.players[i].bot||r.players[i].managed||now>=r.deadline){const automated=r.players[i].bot||r.players[i].managed;autoTurn(r,i);q.answers[k]=automated?q.choices[k][0]:'pass';changed=true}}
 if(Object.keys(q.choices).every(k=>q.answers[k])){resolve(r,now);changed=true}
 }else if(r.phase==='play'&&now>=r.deadline){const i=r.turn;autoTurn(r,i);const opts=options(r,i);if(opts.includes('hu'))act(r,i,'hu',undefined,now);else{const k=opts.find(x=>x.startsWith('gang:')||x.startsWith('bu:'));if(k){const [a,t]=k.split(':');act(r,i,a,Number(t),now)}else act(r,i,'discard',suggest(r.players[i]),now)}changed=true}return changed}
// Advance due actions atomically, respecting each bot's 500 ms or 2 s deadline
// and preserving every un-managed human choice and response deadline.
export function advance(r:Room,now:number){let changed=false;for(let n=0;n<(r.fast?250:1);n++){if(!tick(r,now))break;changed=true;if(r.phase==='done')break}return changed}
export function archiveRound(r:Room,at:number){if(!r.result||r.phase!=='done')return;
 r.completedRounds=Math.max(r.completedRounds??0,r.round);
 if(!r.roundSummaries?.some(h=>h.round===r.round))r.roundSummaries=[...(r.roundSummaries??[]),{round:r.round,at,players:r.players.map(p=>({name:p.name,avatar:p.avatar,score:p.score})),delta:[...r.result.delta],winner:r.result.winner,kind:r.result.kind}].slice(-50);
 if(!r.history?.some(h=>h.round===r.round))r.history=[...(r.history??[]),{round:r.round,at,players:JSON.parse(JSON.stringify(r.players)),result:JSON.parse(JSON.stringify(r.result))}].slice(-10);
}
// Only this player's known state participates in a claim context. Other players'
// responses and online heartbeats must not invalidate an unanswered claim.
export function actionContext(r:Room,i:number){const p=r.players[i];return JSON.stringify([r.round,r.phase,r.turn,r.deadline,r.wall.length,r.turn===i?r.drawn:null,r.turn===i?r.drawnIndex:null,r.claim?[r.claim.from,r.claim.t,r.claim.rob]:null,p.hand,p.melds,p.river.length])}
export function view(r:Room,id:string):any{const me=r.players.findIndex(p=>p.id===id);if(me<0)throw new Error('你尚未加入这个房间');const revealed=r.players.map((p,i)=>r.phase==='done'&&(r.result?.revealed?.[i]??(i===r.result?.winner||waits(p).length>0)));const {chickenDetails,chickenAudit,beanAudit,...publicResult}=r.result??{};const visibleResult=r.result?{...publicResult,myChickenDetails:chickenDetails?.[me]??null,myChickenAudit:chickenAudit?.[me]??null,beanAudit:beanAudit?.map((e:any)=>({...e,tile:e.type==='an'&&e.seat!==me?null:e.tile}))??null}:null;const history=(r.history??[]).map(h=>{const index=h.players.findIndex(p=>p.id===id);if(index<0)return{round:h.round,at:h.at,bill:null};const snapshot=view({...r,...h,phase:'done',wall:[],claim:null,lastDiscard:null,history:[],roundSummaries:[]},id);return{round:h.round,at:h.at,bill:{code:r.code,round:h.round,phase:'done',me:index,players:snapshot.players,result:snapshot.result}}});const last=r.lastDiscard;return{rules:validateRules(r.rules??defaultRules()),ruleRevision:r.ruleRevision??1,roundRules:validateRules(r.result?.rules??activeRules(r)),roundRuleRevision:r.result?.ruleRevision??r.roundRuleRevision??1,flipPenaltyOnlyFixed:r.phase==='lobby'?true:!!r.flipPenaltyOnlyFixed,code:r.code,fast:r.fast??false,completedRounds:r.completedRounds??(r.phase==='done'?r.round:Math.max(0,r.round-1)),roundSummaries:r.roundSummaries??[],history,lastDiscard:last&&r.players[last.seat]?.river[last.index]===last.tile?last:null,phase:r.phase,turn:r.turn,dealer:r.dealer,round:r.round,deadline:r.deadline,remaining:r.wall.length,botDelay:botDelay(r),tableEvents:r.tableEvents??[],soundEvents:r.soundEvents??[],me,isHost:r.host===id,logs:r.logs,result:visibleResult,version:r.playVersion??r.version,revision:r.version,actionContext:actionContext(r,me),options:r.players[me].managed?[]:options(r,me),drawn:r.turn===me&&r.phase==='play'?r.drawn:null,drawnIndex:r.turn===me&&r.phase==='play'&&r.drawn!==null?(r.drawnIndex??r.players[me].hand.lastIndexOf(r.drawn)):null,claim:r.claim?{from:r.claim.from,t:r.claim.t,rob:r.claim.rob}:null,waits:waits(r.players[me]),suggestion:r.phase==='play'&&r.turn===me?suggest(r.players[me]):null,players:r.players.map((p,i)=>({name:p.name,avatar:p.avatar,managed:p.managed??false,autoMoves:p.autoMoves??0,bot:p.bot,ready:p.ready,score:p.score,seen:p.seen,revealed:revealed[i],hand:i===me||revealed[i]?p.hand:[],count:p.hand.length,melds:p.melds.map(m=>m.hidden&&i!==me?{...m,t:-1}:m),river:p.river,charges:(r.charges??[]).filter(c=>c.player===i&&!c.claimed).map(c=>c.index)}))}}
