'use client';
import {useEffect,useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {CURRENT_VERSION,CURRENT_ACTIVITY} from '@/lib/release-config';
import {RELEASE_HISTORY,type ReleaseRecord} from '@/lib/release-history';
export function beijingTime(value:string){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
}
export function VersionTable({records}:{records:ReleaseRecord[]}){
 const rows=[...records.filter(r=>r.version<=CURRENT_VERSION)];
 if(!rows.some(r=>r.version===CURRENT_VERSION))rows.push({version:CURRENT_VERSION,activity:CURRENT_ACTIVITY,deployedAt:'',commit:''});
 return <div className="version-table-scroll" tabIndex={0} aria-label="版本总览表格，可左右滚动"><table className="version-table"><thead><tr><th>版本</th><th>成功部署记录时间（北京时间）</th><th>主要活动</th><th>提交</th></tr></thead><tbody>{rows.sort((a,b)=>a.version-b.version).map(row=><tr key={row.version} className={row.version===CURRENT_VERSION?'current-version-row':''}><td>v{row.version}{row.version===CURRENT_VERSION&&<small>当前</small>}</td><td>{row.deployedAt?beijingTime(row.deployedAt):'发布记录更新中'}</td><td>{row.activity}</td><td><code title={row.commit||undefined}>{row.commit?row.commit.slice(0,8):'—'}</code></td></tr>)}</tbody></table></div>;
}
export function VersionHistory(){
 const [open,setOpen]=useState(false),[records,setRecords]=useState<ReleaseRecord[]>(RELEASE_HISTORY),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!open)return;let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,attempts=0;const controller=new AbortController();
  async function refresh(){
   try{setError('');const response=await fetch('/api/releases',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json() as {records:ReleaseRecord[]};if(!data||!Array.isArray(data.records))throw new Error();if(disposed)return;setRecords(data.records);if(!data.records.some((r:ReleaseRecord)=>r.version===CURRENT_VERSION)&&++attempts<20)timer=setTimeout(refresh,3000)}
   catch{if(!disposed)setError('最新版本记录暂时加载失败，历史记录仍可查看。')}
  }
  void refresh();return()=>{disposed=true;controller.abort();if(timer)clearTimeout(timer)};
 },[open,retry]);
 return <><div className="version-footer"><span>当前版本：v{CURRENT_VERSION}</span><button type="button" onClick={()=>setOpen(true)}>版本历史修改</button></div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="version-dialog"><DialogHeader><DialogTitle>版本总览</DialogTitle><DialogDescription>按版本顺序记录成功部署时间、主要活动和对应提交。</DialogDescription></DialogHeader>{error&&<p className="version-error" role="status">{error}<button onClick={()=>setRetry(n=>n+1)}>重试</button></p>}<VersionTable records={records}/></DialogContent></Dialog></>;
}
