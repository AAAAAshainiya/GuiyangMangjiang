import {act,advance,create,player,start,view,type Room} from './game';

// All game state and its clock stay in this browser, never in an online room.
export class SoloGame{
 room:Room;pausedAt:number|null=null;
 constructor(name='单人牌友',avatar='🐼',now=Date.now()){
  this.room=create('SOLO','solo',name);this.room.players[0].avatar=avatar;
  this.room.players.push(...['黔灵阿青','花溪小北','南明阿川'].map((n,i)=>player('bot:solo'+i,n,true)));
  this.room.players[0].ready=true;start(this.room,now);this.room.version=0;this.room.playVersion=0;
 }
 bump(){this.room.version=(this.room.version??0)+1;this.room.playVersion=this.room.version}
 snapshot(now=Date.now()){const v=view(this.room,'solo');return {...v,local:true,solo:true,paused:this.pausedAt!==null,remainingMs:Math.max(0,this.room.deadline-(this.pausedAt??now)),options:this.pausedAt!==null?[]:v.options,messages:[],interactions:[]}}
 tick(now=Date.now()){if(this.pausedAt!==null||!advance(this.room,now))return false;this.bump();return true}
 pause(now=Date.now()){if(this.pausedAt!==null||!['play','claim'].includes(this.room.phase))return;this.pausedAt=now;this.bump()}
 resume(now=Date.now()){if(this.pausedAt===null)return;this.room.deadline+=Math.max(0,now-this.pausedAt);this.pausedAt=null;this.bump()}
 human(action:string,tile?:number,now=Date.now()){
  if(action==='pause'){this.pause(now);return}if(action==='continue'){this.resume(now);return}
  if(this.pausedAt!==null)throw new Error('牌局已暂停，继续后再操作');
  if(action==='ready'||action==='start'){if(this.room.phase!=='done')throw new Error('本局尚未结束');this.room.players[0].ready=true;start(this.room,now)}
  else if(action==='speed'){if(!['play','done','lobby'].includes(this.room.phase)||tile!==0&&tile!==1)throw new Error('当前不能切换节奏');this.room.fast=tile===1;if(this.room.phase==='play'&&this.room.players[this.room.turn].bot)this.room.deadline=now+(this.room.fast?500:2000)}
  else if(action==='resume'){this.room.players[0].managed=false;if(this.room.phase==='play'&&this.room.turn===0)this.room.deadline=now+45000}
  else act(this.room,0,action,tile,now);
  advance(this.room,now);this.bump();
 }
 serialize(now=Date.now()){return JSON.stringify({room:this.room,pausedAt:this.pausedAt,savedAt:now,remainingMs:Math.max(0,this.room.deadline-(this.pausedAt??now))})}
 static restore(value:string|null,now=Date.now()){
  try{const v=JSON.parse(value??'null'),r=v?.room;if(r?.code!=='SOLO'||r.host!=='solo'||r.players?.length!==4||r.players[0].id!=='solo'||r.players.slice(1).some((p:any)=>!p.bot)||!['play','claim','done'].includes(r.phase)||!Array.isArray(r.wall)||r.wall.length>108||r.players.some((p:any)=>!Array.isArray(p.hand)||p.hand.length>14||p.hand.some((t:any)=>!Number.isInteger(t)||t<0||t>26))||!Number.isFinite(v.remainingMs)||v.remainingMs<0||v.remainingMs>45000)return null;
   const game=Object.create(SoloGame.prototype) as SoloGame;game.room=r;
   // Restore active games paused, so refresh never spends the player's time.
   game.pausedAt=r.phase==='done'?null:now;r.deadline=r.phase==='done'?0:now+v.remainingMs;game.bump();return game;
  }catch{return null}
 }
}
