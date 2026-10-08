export type Meld={t:number,k:'peng'|'gang',hidden?:boolean};
export type Player={id:string,name:string,bot:boolean,ready:boolean,seen:number,hand:number[],melds:Meld[],river:number[],score:number};
export type Claim={from:number,t:number,rob:boolean,choices:Record<string,string[]>,answers:Record<string,string>};
export type BeanTransfer={from:number,to:number,points:number};
export type ChickenDetail={tile:number,source:'hand'|'peng'|'gang'|'an'|'river',charge:boolean,count:number,unit:number,points:number};
export type Room={code:string,host:string,players:Player[],phase:'lobby'|'play'|'claim'|'done',wall:number[],turn:number,dealer:number,round:number,deadline:number,claim:Claim|null,drawn:number|null,drawnIndex?:number|null,canKong:boolean,afterKong:boolean,logs:string[],result:any,beans:number[],beanValues?:number[],beanTransfers?:BeanTransfer[],scoringVersion?:number,version?:number,charges?:{tile:number,player:number,index:number,claimed:boolean}[]};
export const CHAT_EMOJIS=['😂','👍','😭','😎','🤔','👏'];
export const tileName=(t:number)=>`${t%9+1}${['万','筒','条'][Math.floor(t/9)]}`;
export const isChicken=(t:number)=>t===0||t===18||t===16;
export const chickenPoints=(t:number)=>isChicken(t)?2:0;
export const botDelay=(_r:Room)=>2000;
export function log(r:Room,s:string){r.logs=[s,...r.logs].slice(0,30)}
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
function winAllowed(p:Player,t:number,rob=false){let z=pattern([...p.hand,t],p.melds);return z&&(rob||z.points>1||p.melds.some(m=>m.k==='gang'))}
export function options(r:Room,i:number){const p=r.players[i];if(!p)return [];
 if(r.phase==='claim')return r.claim?.choices[i]&&!r.claim.answers[i]?[...r.claim.choices[i],'pass']:[];
 if(r.phase!=='play'||r.turn!==i)return [];
 // A completed shape after peng is still a discard turn, never a self-draw.
 const a=['discard'];if(r.drawn!==null&&Number.isInteger(r.drawn)&&pattern(p.hand,p.melds))a.push('hu');
 if(r.wall.length&&r.canKong){for(let t=0;t<27;t++){if(count(p.hand,t)===4)a.push('gang:'+t);if(count(p.hand,t)&&p.melds.some(m=>m.k==='peng'&&m.t===t))a.push('bu:'+t)}}return a;
}
export function player(id:string,name:string,bot=false):Player{return{id,name,bot,ready:bot,seen:Date.now(),hand:[],melds:[],river:[],score:0}}
export function create(code:string,id:string,name:string):Room{return{code,host:id,players:[player(id,name)],phase:'lobby',wall:[],turn:0,dealer:0,round:0,deadline:0,claim:null,drawn:null,canKong:false,afterKong:false,logs:['牌桌已开好，等朋友入座。'],result:null,beans:[0,0,0,0],beanValues:[0,0,0,0],beanTransfers:[],scoringVersion:2,charges:[]}}
function deadline(r:Room,now:number){r.deadline=now+(r.players[r.turn]?.bot?botDelay(r):45000)}
export function start(r:Room,now:number){if(r.players.length!==4||r.players.some(p=>!p.ready))throw new Error('需要四个座位全部准备，空位可以用电脑补齐');r.round++;r.phase='play';r.wall=Array.from({length:108},(_,i)=>Math.floor(i/4));
 for(let i=107;i>0;i--){const a=new Uint32Array(1);crypto.getRandomValues(a);const j=a[0]%(i+1);[r.wall[i],r.wall[j]]=[r.wall[j],r.wall[i]]}
 r.players.forEach(p=>{p.hand=sort(r.wall.splice(0,13));p.melds=[];p.river=[]});r.turn=r.dealer;r.beans=[0,0,0,0];r.beanValues=[0,0,0,0];r.beanTransfers=[];r.scoringVersion=2;r.charges=[];r.claim=null;r.result=null;r.afterKong=false;draw(r,r.turn,now);log(r,`第 ${r.round} 局开始，${r.players[r.dealer].name}坐庄`)}
function draw(r:Room,i:number,now:number,kong=false){if(!r.wall.length){finish(r,-1,-1,'流局');return}r.turn=i;r.phase='play';const t=r.wall.pop()!;r.players[i].hand.push(t);sort(r.players[i].hand);r.drawn=t;r.drawnIndex=r.players[i].hand.lastIndexOf(t);r.canKong=true;r.afterKong=kong;deadline(r,now)}
function transfer(a:number[],from:number,to:number,n:number){a[from]-=n;a[to]+=n}
function bean(r:Room,i:number,type:string,from=-1){const n=r.scoringVersion===2?4:type==='ming'?3:type==='an'?2:1;if(r.beanValues)r.beanValues[i]+=n;const pay=(j:number)=>{transfer(r.beans,j,i,n);r.beanTransfers?.push({from:j,to:i,points:n})};if(type==='ming')pay(from);else r.players.forEach((_,j)=>{if(j!==i)pay(j)})}
function chickenDetails(r:Room,i:number,eligible:boolean,rooster:number|null):ChickenDetail[]{
 const p=r.players[i],details:ChickenDetail[]=[];
 const add=(tile:number,source:ChickenDetail['source'],count=1,charge=false)=>{
  const unit=(charge?4:chickenPoints(tile))+(tile===rooster?1:0);if(!unit)return;
  const existing=details.find(d=>d.tile===tile&&d.source===source&&d.charge===charge);
  if(existing){existing.count+=count;existing.points+=unit*count}else details.push({tile,source,charge,count,unit,points:unit*count});
 };
 // A claimed tile leaves the river and belongs only to its recipient.
 p.river.forEach((t,index)=>add(t,'river',1,(r.charges??[]).some(c=>c.player===i&&c.index===index&&!c.claimed&&c.tile===t)));
 if(eligible){p.hand.forEach(t=>add(t,'hand'));p.melds.forEach(m=>add(m.t,m.k==='peng'?'peng':m.hidden?'an':'gang',m.k==='gang'?4:3))}
 return details;
}
function finish(r:Room,winner:number,from:number,kind:string){
 // A drawn round cancels every component, including previously earned beans.
 if(winner<0){r.beans=[0,0,0,0];r.beanValues=[0,0,0,0];if(r.beanTransfers)r.beanTransfers=[];}
 const delta=[...r.beans],hu=[0,0,0,0],chicken=[0,0,0,0];let flip:number|null=null,rooster:number|null=null,values=[0,0,0,0];let pat=null;
 const huValues=[0,0,0,0];let detailValues:ChickenDetail[][]=[[],[],[],[]];
 if(winner>=0){pat=pattern(r.players[winner].hand,r.players[winner].melds)!;const n=pat.points*(from<0&&r.scoringVersion===2?3:1)*(kind==='杠上开花'||kind==='抢杠胡'?2:1);huValues[winner]=n;
 if(from<0)r.players.forEach((_,j)=>{if(j!==winner)transfer(hu,j,winner,n)});else transfer(hu,from,winner,n);
 flip=r.wall.length?r.wall.pop()!:null;rooster=flip===null?null:Math.floor(flip/9)*9+(flip%9+1)%9;
 const eligible=r.players.map((p,i)=>i===winner||waits(p).length>0);
 detailValues=r.players.map((_,i)=>chickenDetails(r,i,eligible[i],rooster));
 values=detailValues.map((details,i)=>details.reduce((sum,d)=>sum+d.points,0)*(eligible[i]?1:-1));values=values.map(v=>v||0);
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)transfer(chicken,j,i,values[i]-values[j]);
 }
 r.players.forEach((p,i)=>{delta[i]+=hu[i]+chicken[i];p.score+=delta[i];p.ready=p.bot});
 const revealed=r.players.map((p,i)=>i===winner||waits(p).length>0);const waitTiles=r.players.map(p=>waits(p));
 r.result={revealed,waitTiles,winner,from,kind,pattern:pat?.name,flip,rooster,values,huValues,beanValues:r.beanValues?[...r.beanValues]:r.players.map(p=>p.melds.some(m=>m.k==='gang')?null:0),beanTransfers:r.beanTransfers?[...r.beanTransfers]:null,chickenDetails:detailValues,scoringVersion:r.scoringVersion??1,hu,chicken,beans:[...r.beans],delta};r.phase='done';r.claim=null;r.deadline=0;r.dealer=winner>=0?winner:(r.dealer+1)%4;log(r,winner<0?'牌墙已摸完，本局流局':`${r.players[winner].name} ${kind}！${pat?.name}`);
}
function makeClaim(r:Room,from:number,t:number,rob:boolean,now:number){const choices:Record<string,string[]>={};r.players.forEach((p,i)=>{if(i===from)return;const a=[];if(winAllowed(p,t,rob))a.push('hu');if(!rob){if(count(p.hand,t)>=3&&r.wall.length)a.push('gang');if(count(p.hand,t)>=2)a.push('peng')}if(a.length)choices[i]=a});
 if(Object.keys(choices).length){r.claim={from,t,rob,choices,answers:{}};r.phase='claim';r.deadline=now+15000;return true}return false;
}
function completeBu(r:Room,i:number,t:number,now:number){const p=r.players[i];p.hand.splice(p.hand.indexOf(t),1);p.melds.find(m=>m.t===t&&m.k==='peng')!.k='gang';bean(r,i,'bu');log(r,`${p.name}补杠 ${tileName(t)}`);r.claim=null;draw(r,i,now,true)}
function takeDiscard(r:Room,from:number){const p=r.players[from];for(const c of r.charges??[])if(c.player===from&&c.index===p.river.length-1&&!c.claimed)c.claimed=true;p.river.pop()}
function resolve(r:Room,now:number){const q=r.claim!;const order=[1,2,3].map(n=>(q.from+n)%4);const hu=order.find(i=>q.answers[i]==='hu');
 if(hu!==undefined){if(q.rob){r.players[q.from].hand.splice(r.players[q.from].hand.indexOf(q.t),1)}else takeDiscard(r,q.from);r.players[hu].hand.push(q.t);sort(r.players[hu].hand);finish(r,hu,q.from,q.rob?'抢杠胡':'接炮');return}
 const call=order.find(i=>['gang','peng'].includes(q.answers[i]));if(call!==undefined){const p=r.players[call];const isGang=q.answers[call]==='gang';for(let k=0;k<(isGang?3:2);k++)p.hand.splice(p.hand.indexOf(q.t),1);p.melds.push({t:q.t,k:isGang?'gang':'peng'});takeDiscard(r,q.from);r.claim=null;log(r,`${p.name}${isGang?'明杠':'碰'} ${tileName(q.t)}`);if(isGang){bean(r,call,'ming',q.from);draw(r,call,now,true)}else{r.phase='play';r.turn=call;r.drawn=null;r.drawnIndex=null;r.canKong=false;r.afterKong=false;deadline(r,now)}return}
 r.claim=null;if(q.rob)completeBu(r,q.from,q.t,now);else draw(r,(q.from+1)%4,now);
}
export function act(r:Room,i:number,action:string,t:number|undefined,now:number){const p=r.players[i],opts=options(r,i);if(r.phase==='claim'){if(!opts.includes(action))throw new Error('当前不能执行这个操作');r.claim!.answers[i]=action;log(r,`${p.name}${action==='pass'?'选择过牌':'已选择响应'}`);if(Object.keys(r.claim!.choices).every(k=>r.claim!.answers[k]))resolve(r,now);return}
 if(action==='hu'&&opts.includes('hu')){finish(r,i,-1,r.afterKong?'杠上开花':'自摸');return}
 if(action==='discard'&&opts.includes('discard')&&Number.isInteger(t)&&p.hand.includes(t!)){p.hand.splice(p.hand.indexOf(t!),1);p.river.push(t!);r.charges??=[];if(isChicken(t!)&&!r.charges.some(c=>c.tile===t)){r.charges.push({tile:t!,player:i,index:p.river.length-1,claimed:false});log(r,`${p.name}打出冲锋鸡 ${tileName(t!)}`)}r.drawn=null;r.drawnIndex=null;r.canKong=false;log(r,`${p.name}打出 ${tileName(t!)}`);if(!makeClaim(r,i,t!,false,now))draw(r,(i+1)%4,now);return}
 if(action==='gang'&&opts.includes('gang:'+t)){p.hand=p.hand.filter(x=>x!==t);p.melds.push({t:t!,k:'gang',hidden:true});bean(r,i,'an');log(r,`${p.name}暗杠`);draw(r,i,now,true);return}
 if(action==='bu'&&opts.includes('bu:'+t)){log(r,`${p.name}尝试补杠 ${tileName(t!)}`);if(!makeClaim(r,i,t!,true,now))completeBu(r,i,t!,now);return}
 throw new Error('牌局已经变化，请确认轮到你后再操作');
}
export function suggest(p:Player):number{let best=p.hand[0],lowest=Infinity;for(const t of [...new Set(p.hand)]){let v=(count(p.hand,t)-1)*4;for(const [d,w] of [[-2,0.9],[-1,1.7],[1,1.7],[2,0.9]])if(Math.floor((t+d)/9)===Math.floor(t/9))v+=count(p.hand,t+d)*w;if(t===18||t===0)v+=.35;if(t===16)v+=.7;v+=(t%9===0||t%9===8)?-.15:0;if(v<lowest){lowest=v;best=t}}return best}
export function tick(r:Room,now:number){let changed=false;if(r.phase==='claim'){const q=r.claim!;for(const k of Object.keys(q.choices)){if(q.answers[k])continue;const i=Number(k);if(r.players[i].bot||now>=r.deadline){q.answers[k]=r.players[i].bot?q.choices[k][0]:'pass';changed=true}}
 if(Object.keys(q.choices).every(k=>q.answers[k])){resolve(r,now);changed=true}
 }else if(r.phase==='play'&&now>=r.deadline){const i=r.turn,opts=options(r,i);if(opts.includes('hu'))act(r,i,'hu',undefined,now);else{const k=opts.find(x=>x.startsWith('gang:')||x.startsWith('bu:'));if(k){const [a,t]=k.split(':');act(r,i,a,Number(t),now)}else{if(!r.players[i].bot)log(r,`${r.players[i].name}超时，自动出牌`);act(r,i,'discard',suggest(r.players[i]),now)}}changed=true}return changed}
export function view(r:Room,id:string){const me=r.players.findIndex(p=>p.id===id);if(me<0)throw new Error('你尚未加入这个房间');const revealed=r.players.map((p,i)=>r.phase==='done'&&(r.result?.revealed?.[i]??(i===r.result?.winner||waits(p).length>0)));const {chickenDetails,...publicResult}=r.result??{};const visibleResult=r.result?{...publicResult,myChickenDetails:chickenDetails?.[me]??null}:null;return{code:r.code,phase:r.phase,turn:r.turn,dealer:r.dealer,round:r.round,deadline:r.deadline,remaining:r.wall.length,botDelay:botDelay(r),me,isHost:r.host===id,logs:r.logs,result:visibleResult,version:r.version,options:options(r,me),drawn:r.turn===me&&r.phase==='play'?r.drawn:null,drawnIndex:r.turn===me&&r.phase==='play'&&r.drawn!==null?(r.drawnIndex??r.players[me].hand.lastIndexOf(r.drawn)):null,claim:r.claim?{from:r.claim.from,t:r.claim.t,rob:r.claim.rob}:null,waits:waits(r.players[me]),suggestion:r.phase==='play'&&r.turn===me?suggest(r.players[me]):null,players:r.players.map((p,i)=>({name:p.name,bot:p.bot,ready:p.ready,score:p.score,seen:p.seen,revealed:revealed[i],hand:i===me||revealed[i]?p.hand:[],count:p.hand.length,melds:p.melds.map(m=>m.hidden&&i!==me?{...m,t:-1}:m),river:p.river,charges:(r.charges??[]).filter(c=>c.player===i&&!c.claimed).map(c=>c.index)}))}}
