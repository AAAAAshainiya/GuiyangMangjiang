'use client';
import {useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {accountRequest,useAccount} from './account-context';
export function AccountExports(){
 const account=useAccount(),owner=useRef(account.user);owner.current=account.user;const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function download(kind:'rules'|'bills'){
  const user=owner.current;if(!user||busy)return;setBusy(true);setMessage('正在生成Excel…');setError('');
  try{const excel=await import('@/lib/account-excel');if(kind==='rules'){await excel.downloadExcel(excel.rulesWorkbook(user.rules),'个人积分规则.xlsx')}
   else{let offset:number|null=0;const records:any[]=[];while(offset!==null){const d=await accountRequest('/api/account/data?export=1&offset='+offset);if(owner.current?.id!==user.id||d.profile.username!==user.username)throw new Error('账号已变化，请重新导出');records.push(...d.records);offset=d.next}await excel.downloadExcel(excel.billsWorkbook(records),'个人对局账单.xlsx')}
   setMessage(kind==='rules'?'个人积分规则已导出，可修改后导入。':'个人账单已导出，包含各局盈亏与收付明细。');
  }catch(e){setMessage('');setError(e instanceof Error?e.message:'导出失败，请重试')}finally{setBusy(false)}
 }
 return <section className="account-exports"><h3>导出个人数据</h3><div className="account-row"><Button variant="outline" disabled={busy} onClick={()=>void download('rules')}>导出个人积分规则（Excel）</Button><Button variant="outline" disabled={busy} onClick={()=>void download('bills')}>导出个人账单（Excel）</Button></div>{message&&<p className="account-note" role="status">{message}</p>}{error&&<p className="account-error" role="alert">{error}</p>}</section>
}
