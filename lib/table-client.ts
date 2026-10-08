// Bound the entire request (including JSON parsing), even if a browser transport
// ignores abort. Mutations are never automatically replayed after a timeout.
export async function tableRequest(url:string,init:RequestInit={},timeoutMs=8000){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 const abort=()=>controller.abort();init.signal?.addEventListener('abort',abort,{once:true});
 try{
  if(init.signal?.aborted)throw new Error('请求已取消');
  return await Promise.race([
   (async()=>{const response=await fetch(url,{...init,signal:controller.signal,cache:'no-store'});const data:any=await response.json();if(!response.ok)throw new Error(data.error||'连接失败，请重试');return data})(),
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
