// Bound the entire request (including JSON parsing), even if a browser transport
// ignores abort. This transport never replays a mutation by itself.
export async function tableRequest(url:string,init:RequestInit={},timeoutMs=8000){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 const abort=()=>controller.abort();init.signal?.addEventListener('abort',abort,{once:true});
 try{
  if(init.signal?.aborted)throw new Error('请求已取消');
  return await Promise.race([
   (async()=>{const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});const data:any=await response.json();if(!response.ok)throw new TableRequestError(data.error||'连接失败，请重试',response.status,data);return data})(),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('连接超时，正在重新同步牌桌'))},timeoutMs)})
  ]);
 }finally{clearTimeout(timer!);init.signal?.removeEventListener('abort',abort)}
}

export class TablePoller{
 private controller:AbortController|null=null;
 private generation=0;
 private stopped=false;
 lastSuccess=Date.now();
 private read:(signal:AbortSignal)=>Promise<any>;
 private apply:(data:any)=>void;
 private connected:(ok:boolean)=>void;
 private busy:()=>boolean;
 private onError:(error:unknown)=>void;
 constructor(read:(signal:AbortSignal)=>Promise<any>,apply:(data:any)=>void,connected:(ok:boolean)=>void,busy:()=>boolean,onError:(error:unknown)=>void){this.read=read;this.apply=apply;this.connected=connected;this.busy=busy;this.onError=onError}
 async poll(force=false){
  if(this.stopped)return;
  if(Date.now()-this.lastSuccess>8000)this.connected(false);
  if(force){this.generation++;this.controller?.abort();this.controller=null;}
  if(this.controller||this.busy())return;
  const controller=new AbortController(),generation=this.generation;this.controller=controller;
  try{const data=await this.read(controller.signal);if(!this.stopped&&generation===this.generation){this.apply(data);this.lastSuccess=Date.now();this.connected(true)}}
  catch(error){if(!this.stopped&&generation===this.generation){this.connected(false);this.onError(error)}}
  finally{if(this.controller===controller)this.controller=null}
 }
 offline(){this.generation++;this.controller?.abort();this.controller=null;this.connected(false)}
 stop(){this.stopped=true;this.generation++;this.controller?.abort();this.controller=null}
}

export class TableRequestError extends Error{
 status:number;data:any;
 constructor(message:string,status:number,data:any){super(message);this.status=status;this.data=data}
}
type PendingAction={rules?:unknown,round?:number,action:string,code:string,name?:string,tile?:number,version:number,context?:string,clientId:string,createdAt:number};
const ROOM_ACTIONS=['rules','speed','profile','resume','leave','fill','removeBots','ready','start','terminate','kick','discard','hu','skipHu','skipKong','peng','gang','bu','pass'];
const PLAY_ACTIONS=['discard','hu','skipHu','skipKong','peng','gang','bu','pass'];
// One logical action retains the same ID through timeout, refresh and retry.
// A fresh snapshot is always checked before replaying an unacknowledged action.
export class TableActionCoordinator{
 pending:PendingAction|null=null;
 private active:string|null=null;
 private attempts=0;
 private retryAt=0;
 private request:typeof tableRequest;
 private storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null;
 constructor(request:typeof tableRequest=tableRequest,storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>|null){this.request=request;this.storage=null;try{this.storage=storage===undefined?(typeof sessionStorage==='undefined'?null:sessionStorage):storage}catch{}}
 private persist(){try{if(this.pending)this.storage?.setItem('mahjong-action:'+this.pending.code,JSON.stringify(this.pending))}catch{/* A disabled browser store must not block play. */}}
 clear(){if(this.pending){try{this.storage?.removeItem('mahjong-action:'+this.pending.code)}catch{}}this.pending=null;this.attempts=0;this.retryAt=0}
 restore(code:string){if(this.pending?.code===code)return;this.clear();try{const p=JSON.parse(this.storage?.getItem('mahjong-action:'+code)??'null');if(p&&p.code===code&&ROOM_ACTIONS.includes(p.action)&&typeof p.clientId==='string'&&/^[a-f0-9-]{36}$/.test(p.clientId)&&Number.isInteger(p.version)&&typeof p.createdAt==='number'&&Date.now()-p.createdAt<30*60000&&Date.now()>=p.createdAt&&(p.tile===undefined||Number.isInteger(p.tile)&&p.tile>=0&&p.tile<=26)&&(p.context===undefined||typeof p.context==='string'&&p.context.length<=2048))this.pending=p;else this.storage?.removeItem('mahjong-action:'+code)}catch{}}
 url(code:string){return '/api/table?room='+encodeURIComponent(code)+(this.pending?.code===code?'&actionId='+encodeURIComponent(this.pending.clientId):'')}
 async perform(body:any){if(this.pending)throw new Error('上一项操作正在确认，请稍等');this.pending={...body,clientId:crypto.randomUUID(),createdAt:Date.now()};this.persist();return this.send()}
 private async send(){const p=this.pending;if(!p||this.active===p.clientId)return;this.active=p.clientId;this.attempts++;try{
  const data=await this.request('/api/table',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
  if(this.pending===p)this.clear();return data;
 }catch(error){
  if(this.pending===p){if(error instanceof TableRequestError&&error.status<500)this.clear();else this.retryAt=Date.now()+Math.min(15000,1500*2**Math.min(this.attempts-1,4))}
  throw error;
 }finally{if(this.active===p.clientId)this.active=null}}
 async recover(data:any,signal?:AbortSignal):Promise<{data:any,outcome:'confirmed'|'changed'|'pending'|null}>{
  const p=this.pending;if(!p||data.code&&p.code!==data.code)return{data,outcome:null};
  if(data.kicked){this.clear();return{data,outcome:'changed'}}
  if(data.actionAck?.clientId!==p.clientId)return{data,outcome:'pending'};
  if(data.actionAck.status==='applied'){this.clear();return{data,outcome:'confirmed'}}
  if(data.actionAck.status!=='not_found')return{data,outcome:'pending'};
  const valid=PLAY_ACTIONS.includes(p.action)&&p.context!==undefined?data.actionContext===p.context:p.action==='resume'?data.players?.[data.me]?.managed===true:p.action==='terminate'?data.round===p.round&&['play','claim'].includes(data.phase)&&data.isHost:data.version===p.version;
  if(!valid||Date.now()-p.createdAt>=30*60000){this.clear();return{data,outcome:'changed'}}
  if(this.active===p.clientId||signal?.aborted||Date.now()<this.retryAt)return{data,outcome:'pending'};
  try{const result=await this.send();return{data:result??data,outcome:result?'confirmed':'pending'}}
  catch(error){if(error instanceof TableRequestError&&error.status<500)return{data:error.data.state??data,outcome:'changed'};return{data,outcome:'pending'}}
 }
}
