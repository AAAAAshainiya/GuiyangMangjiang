import {act,create,player,start,view,options,suggest,waits,tileName,isChicken,activeRules,setRoomRules,type Room} from './game';
export const LESSON_STEPS=[
 {title:'你的手牌与新摸的牌',target:'hand',text:'万、筒、条各有 1—9，每种四张，共 108 张。手牌在桌子下方，右上角红点只标记新摸的那一张。先认识牌面，再选择要打的牌。'},
 {title:'组成顺子、刻子和对子',target:'hand',text:'同花色连续三张是顺子，三张相同是刻子，两张相同是对子。普通胡牌需要四组加一对，七对则是七个对子。本桌不能吃别人的弃牌，但自己手里的牌可以组成顺子。'},
 {title:'看每家正前方的弃牌',target:'river',text:'每家打出的牌放在自己的正前方。带金色边框的牌是全桌最新弃牌。冲锋鸡横放；被碰、杠、胡取走后离开原弃牌区。'},
 {title:'碰杠区与隐藏的暗杠',target:'melds',text:'碰需要两张相同手牌配一张弃牌；明杠需要三张配一张弃牌。四张相同手牌可暗杠，原来碰过再摸第四张可补杠。碰后要出一张，杠后要补摸一张。暗杠保持牌背。'},
 {title:'中央按钮与教学节奏',target:'actions',text:'能碰、杠、胡时，中央会出现合法按钮。你自己选择，不限阅读时间。每次人机动作后暂停，读完说明点“继续”。单机练习不创建房间，也不与其他玩家联机。'}
];
export function handGroups(hand:number[]){const remaining=hand.map((t,index)=>({t,index})),groups:{kind:string,tiles:number[],indices:number[]}[]=[];
 const take=(tiles:number[],kind:string)=>{const indices:number[]=[];for(const t of tiles){const at=remaining.findIndex(x=>x.t===t);indices.push(remaining[at].index);remaining.splice(at,1)}groups.push({kind,tiles,indices})};
 for(let t=0;t<27;t++)while(remaining.filter(x=>x.t===t).length>=3)take([t,t,t],'刻子');
 for(let t=0;t<27;t++)if(t%9<=6)while([t,t+1,t+2].every(v=>remaining.some(x=>x.t===v)))take([t,t+1,t+2],'顺子');
 for(let t=0;t<27;t++)if(remaining.filter(x=>x.t===t).length>=2)take([t,t],'对子');
 while(remaining.length){const t=remaining[0].t,n=[t+1,t+2].find(v=>Math.floor(v/9)===Math.floor(t/9)&&remaining.some(x=>x.t===v));if(n!==undefined)take([t,n],'搭子');else take([t],'孤张')}
 return groups;
}
export function discardPreview(r:Room,t:number){const p=r.players[0],hand=[...p.hand],at=hand.indexOf(t);if(at<0)return null;hand.splice(at,1);const ready=waits({...p,hand}),same=p.hand.filter(x=>x===t).length,near=[...new Set(p.hand.filter(x=>x!==t&&Math.floor(x/9)===Math.floor(t/9)&&Math.abs(x-t)<=2))];
 const reason=same>=2?`${tileName(t)}有 ${same} 张，打掉会减少这组对子或刻子的材料。`:near.length?`${tileName(t)}与${near.map(tileName).join('、')}有同花色搭配，打掉会减少这些组合的材料。`:`${tileName(t)}暂时没有相同牌，也没有同花色两点以内的搭配，可以考虑先处理。`;
 return {tile:t,reason,waits:ready,after:ready.length?`打出后听 ${ready.map(tileName).join('、')}。这些牌能组成胡牌；平胡无杠时需要自摸。`:'打出后暂未听牌，继续整理成四组加一对，或七个对子。',chicken:isChicken(t,activeRules(r))?'这是固定鸡。自己打出的鸡是否收分或倒付，要看最终听牌资格；未听牌只向有收鸡资格的人付弃牌鸡分。':null};
}
export type Explanation={title:string,lines:string[]};
export class TrainingGame{
 room:Room;intro=0;gate=true;settlementStep=0;explanation:Explanation={title:'欢迎来到新手练习',lines:['你和三个人机一起练习，所有动作都由你按步骤推进。']};
 constructor(name='新手牌友',avatar='🐼'){this.room=create('LEARN','learner',name);this.room.players[0].avatar=avatar;this.room.players.push(...['黔灵阿青','花溪小北','南明阿川'].map((n,i)=>player('bot:teacher'+i,n,true)));this.room.players[0].ready=true;start(this.room,Date.now());this.room.version=0;this.room.playVersion=0}
 snapshot(){const v=view(this.room,'learner');return {...v,local:true,deadline:Number.MAX_SAFE_INTEGER,options:this.intro<LESSON_STEPS.length||this.gate?[]:v.options,messages:[],interactions:[],lesson:{intro:this.intro,gate:this.gate,settlementStep:this.settlementStep,explanation:this.explanation}}}
 bump(){this.room.version=(this.room.version??0)+1;this.room.playVersion=this.room.version}
 needsHuman(){return this.room.phase==='play'&&this.room.turn===0||this.room.phase==='claim'&&options(this.room,0).length>0}
 next(){if(this.intro<LESSON_STEPS.length){this.intro++;this.gate=this.intro<LESSON_STEPS.length;this.bump();return}
  if(this.room.phase==='done'){this.settlementStep=Math.min(4,this.settlementStep+1);this.bump();return}
  this.gate=false;if(this.needsHuman()){this.explanation={title:this.room.phase==='claim'?'现在选择碰、杠、胡或过牌':'轮到你选牌',lines:this.prompt()};this.bump();return}
  let seat=this.room.turn,a:string,t:number|undefined;
  if(this.room.phase==='claim'){const pending=Object.keys(this.room.claim!.choices).find(k=>!this.room.claim!.answers[k]&&Number(k)!==0);if(pending===undefined)return;seat=Number(pending);a=this.room.claim!.choices[seat][0]}
  else {const opts=options(this.room,seat),kong=opts.find(x=>x.startsWith('gang:')||x.startsWith('bu:'));if(opts.includes('hu'))a='hu';else if(kong){const split=kong.split(':');a=split[0];t=Number(split[1])}else{a='discard';t=suggest(this.room.players[seat])}}
  this.perform(seat,a!,t);this.gate=true;
 }
 prompt(){const r=this.room,p=r.players[0],lines:string[]=[];
  if(r.phase==='claim'){lines.push(`${r.players[r.claim!.from].name}${r.claim!.rob?'尝试补杠':'打出'} ${tileName(r.claim!.t)}。`);for(const a of options(r,0))lines.push(a==='hu'?'胡：这张牌可以组成合法胡牌。胡优先于碰杠，选择后等待其余响应。':a==='peng'?'碰：用你的两张相同牌配这张弃牌，亮出三张，然后再打一张。':a==='gang'?`明杠：用三张相同手牌配这张弃牌，补摸一张；有资格时仅出牌者付豆 ${activeRules(r).ming} 分。`:'过：放弃这次响应，继续等下一次机会。')}
  else{lines.push(r.drawn===null?'你刚碰牌，必须打出一张，此时不能算自摸。':`你新摸到 ${tileName(r.drawn)}，红点标记了它。`);lines.push(`建议先查看 ${tileName(suggest(p))}，点击手牌可看打出后的影响。`);for(const a of options(r,0))if(a.startsWith('gang:'))lines.push(`暗杠 ${tileName(Number(a.split(':')[1]))}：你有四张相同牌，杠后补摸，有资格时三家各付豆 ${activeRules(r).an} 分。`);else if(a.startsWith('bu:'))lines.push(`补杠 ${tileName(Number(a.split(':')[1]))}：把之前的碰补成四张，可能被抢杠胡，成功后补摸。`);else if(a==='hu')lines.push('自摸：新摸牌后已经形成胡牌。三家各付相同的牌型胡分。')}
  if(waits(p).length)lines.push(`当前听 ${waits(p).map(tileName).join('、')}。听牌资格在最终结算时重新判断。`);return lines;
 }
 human(action:string,tile?:number,rules?:unknown){if(action==='rules'){setRoomRules(this.room,0,rules);this.bump();return}if(action==='ready'||action==='start'){if(this.room.phase!=='done'||this.settlementStep<4)throw new Error('先完成四步结算讲解，再练下一局');this.room.players[0].ready=true;start(this.room,Date.now());this.gate=true;this.settlementStep=0;this.explanation={title:'新一局已发牌',lines:['练习累计积分保留。读完说明后点继续，再开始选择。']};this.bump();return}
  if(this.intro<LESSON_STEPS.length||this.gate)throw new Error('先读完说明，点击继续');if(!this.needsHuman())throw new Error('先点击继续，查看人机动作');this.perform(0,action,tile);this.gate=true;
 }
 private perform(seat:number,a:string,t?:number){const r=this.room,phase=r.phase,name=r.players[seat].name,claimed=r.claim?.t,drawBefore=r.drawn;act(r,seat,a,t,Date.now());const lines:string[]=[];
  if(a==='discard'){lines.push(`${name}打出了 ${tileName(t!)}，牌放在自己的正前方。`);if(isChicken(t!,activeRules(r)))lines.push(`这是固定鸡；该牌种第一次打出是冲锋鸡，横放并按 ${activeRules(r).charge} 分基数记录，最终按听牌与热炮资格结算。`);if(seat===0){const ready=waits(r.players[0]);lines.push(ready.length?`你现在听 ${ready.map(tileName).join('、')}。`:'你现在还未听牌，下一次继续整理组合。')}}
  else if(a==='pass')lines.push(`${name}放弃了这次响应。`);
  else if(a==='peng')lines.push(`${name}选择碰 ${tileName(claimed!)}；其余响应结束后，胡牌仍有优先权。碰牌成功后必须出一张。`);
  else if(a==='gang')lines.push(phase==='claim'?`${name}选择明杠 ${tileName(claimed!)}。成功后补摸，豆分由原出牌者付。`:`${name}完成暗杠${seat===0?' '+tileName(t!):''}，四张牌以牌背显示；有资格时另外三家各付豆 ${activeRules(r).an} 分。`);
  else if(a==='bu')lines.push(`${name}尝试补杠 ${tileName(t!)}。抢杠胡机会结束、补杠成功后才产生豆。`);
  else if(a==='hu')lines.push(`${name}选择${phase==='play'?'自摸':'胡牌'}。响应全部结束后，按规则确认赢家。`);
  if(seat===0&&(a==='gang'||a==='bu')&&r.turn===0&&r.phase==='play'&&r.drawn!==drawBefore)lines.push(`补摸了 ${tileName(r.drawn!)}。杠后补牌自摸为杠开；第一张弃牌被胡则是热炮，额外付 ${activeRules(r).hot}，自己的鸡豆烧掉。`);
  if(r.phase==='done'){this.settlementStep=0;lines.push('本局结束。先看翻鸡和账单，再按四步学习胡、豆、鸡与实际盈亏。')}
  else lines.push('读完后点继续。下一次需要你选择时，按钮和手牌会解锁。');this.explanation={title:seat===0?'你的操作已完成':name+'刚刚行动',lines};this.bump();
 }
 serialize(){return JSON.stringify({room:this.room,intro:this.intro,gate:this.gate,settlementStep:this.settlementStep,explanation:this.explanation})}
 static restore(value:string|null){try{const v=JSON.parse(value??'null'),r=v?.room;if(r?.code!=='LEARN'||r.host!=='learner'||r.players?.length!==4||r.players[0].id!=='learner'||r.players.slice(1).some((p:any)=>!p.bot)||!['play','claim','done'].includes(r.phase)||!Array.isArray(r.wall)||r.wall.length>108||r.players.some((p:any)=>!Array.isArray(p.hand)||p.hand.length>14||p.hand.some((t:any)=>!Number.isInteger(t)||t<0||t>26)))return null;const game=Object.create(TrainingGame.prototype) as TrainingGame;game.room=r;game.intro=Math.max(0,Math.min(LESSON_STEPS.length,Number(v.intro)||0));game.gate=!!v.gate;game.settlementStep=Math.max(0,Math.min(4,Number(v.settlementStep)||0));game.explanation=v.explanation?.lines?v.explanation:{title:'练习已恢复',lines:['点击继续，从上次的位置继续学习。']};return game}catch{return null}}
}
