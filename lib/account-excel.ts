import ExcelJS from 'exceljs';
import {settlementLedger} from './settlement-ledger';
import {HU_FIELDS,POINT_FIELDS,validateRules,type GameRules} from './rules';

const FORMAT='贵阳捉鸡积分规则 v1';
const tile=(t:number)=>(t%9+1)+['万','筒','条'][Math.floor(t/9)];
function workbook(){const w=new ExcelJS.Workbook();w.creator='贵阳捉鸡麻将';w.created=new Date();return w}
function table(w:ExcelJS.Workbook,name:string,headers:string[],rows:(string|number)[][],widths:number[]){
 const s=w.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});s.addRow(headers);s.addRows(rows);
 widths.forEach((width,i)=>s.getColumn(i+1).width=width);s.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};
 s.eachRow((row,n)=>{row.height=n===1?28:34;row.eachCell(c=>{c.font={name:'微软雅黑',size:11,color:{argb:n===1?'FFFFFFFF':'FF233C34'},bold:n===1};c.alignment={vertical:'middle',wrapText:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:n===1?'FF24624E':n%2?'FFF3F7F4':'FFFFFFFF'}};c.border={bottom:{style:'hair',color:{argb:'FFDCE5DF'}}}})});
 return s;
}
export function rulesWorkbook(value:GameRules){
 const r=validateRules(value),w=workbook();
 const s=table(w,'积分规则',['项目','分值（0—1000整数）','说明'],[
  ['文件格式',FORMAT,'请保留工作表名称和项目名称，只修改分值及鸡牌是否启用。'],
  ...HU_FIELDS.map(([k,label]):(string|number)[]=>[label,r.hu[k],'成立牌型相加；平胡、龙七对与单吊的替代关系保持不变。']),
  ...POINT_FIELDS.map(([k,label]):(string|number)[]=>[label,r[k],'按现行计分资格结算，从下一局生效。'])
 ],[28,28,64]);
 for(let row=3;row<=s.rowCount;row++)s.getCell(row,2).dataValidation={type:'whole',operator:'between',formulae:[0,1000],showErrorMessage:true,errorTitle:'分数格式不正确',error:'请输入0—1000的整数'};
 const c=table(w,'鸡牌设置',['牌名','是否固定鸡（是／否）'],Array.from({length:27},(_,t)=>[tile(t),r.chickenTiles.includes(t)?'是':'否']),[28,30]);
 for(let row=2;row<=28;row++)c.getCell(row,2).dataValidation={type:'list',allowBlank:false,formulae:['"是,否"'],showErrorMessage:true,error:'请选择是或否'};
 return w;
}
function plain(cell:ExcelJS.Cell,label:string){const v=cell.value;if(v===null||typeof v==='string'||typeof v==='number')return v;throw new Error(label+'不能使用公式、链接或复杂单元格')}
// Inspect compressed and expanded sizes before loading the ZIP-based workbook.
export function validateExcelArchive(buffer:ArrayBuffer){
 if(buffer.byteLength>2*1024*1024)throw new Error('规则文件不能超过2MB');const d=new DataView(buffer);let end=-1;
 for(let i=d.byteLength-22;i>=Math.max(0,d.byteLength-65557);i--)if(d.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw new Error('请选择导出的.xlsx积分规则文件');const count=d.getUint16(end+10,true),offset=d.getUint32(end+16,true);if(count>100||offset>=end)throw new Error('Excel内容过多或格式不正确');
 let p=offset,total=0;for(let i=0;i<count;i++){if(p+46>end||d.getUint32(p,true)!==0x02014b50)throw new Error('Excel文件损坏');if(d.getUint16(p+8,true)&1)throw new Error('不支持加密的Excel');total+=d.getUint32(p+24,true);if(total>10*1024*1024)throw new Error('Excel展开内容过大');p+=46+d.getUint16(p+28,true)+d.getUint16(p+30,true)+d.getUint16(p+32,true)}
}
export async function importRulesExcel(buffer:ArrayBuffer):Promise<GameRules>{
 validateExcelArchive(buffer);const w=workbook();try{await w.xlsx.load(buffer)}catch{throw new Error('Excel无法读取，请使用本站导出的积分规则文件')}
 const s=w.getWorksheet('积分规则'),c=w.getWorksheet('鸡牌设置');if(!s||!c)throw new Error('缺少“积分规则”或“鸡牌设置”工作表');if(s.rowCount>100||c.rowCount>100)throw new Error('规则行数异常');
 const values=new Map<string,string|number|null>();for(let n=2;n<=s.rowCount;n++){const label=plain(s.getCell(n,1),'项目名称');if(label===null)continue;if(typeof label!=='string'||values.has(label))throw new Error('项目名称无效或重复：'+label);values.set(label,plain(s.getCell(n,2),label))}
 if(values.get('文件格式')!==FORMAT)throw new Error('规则文件格式版本不匹配');
 const points=(label:string)=>{const v=values.get(label);if(typeof v!=='number'||!Number.isInteger(v)||v<0||v>1000)throw new Error(label+'必须是0—1000的整数');return v};
 const names=new Set<string>(),chickenTiles:number[]=[];for(let n=2;n<=c.rowCount;n++){const name=plain(c.getCell(n,1),'鸡牌牌名');if(name===null)continue;const t=Array.from({length:27},(_,t)=>tile(t)).indexOf(String(name));if(t<0||names.has(String(name)))throw new Error('鸡牌牌名无效或重复：'+name);names.add(String(name));const yes=plain(c.getCell(n,2),String(name));if(yes!=='是'&&yes!=='否')throw new Error(name+'的固定鸡设置必须填“是”或“否”');if(yes==='是')chickenTiles.push(t)}
 if(names.size!==27)throw new Error('鸡牌设置必须包含全部27种牌');
 const allowed=new Set(['文件格式',...HU_FIELDS.map(f=>f[1]),...POINT_FIELDS.map(f=>f[1])]);for(const name of values.keys())if(!allowed.has(name))throw new Error('不认识的积分项目：'+name);
 return validateRules({chickenTiles,...Object.fromEntries(POINT_FIELDS.map(([k,label])=>[k,points(label)])),hu:Object.fromEntries(HU_FIELDS.map(([k,label])=>[k,points(label)]))});
}
const time=(at:number)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(at));
export function billsWorkbook(records:any[]){
 const w=workbook(),summary:(string|number)[][]=[],details:(string|number)[][]=[];let cumulative=0;
 for(const row of [...records].sort((a,b)=>a.at-b.at||String(a.game_id).localeCompare(String(b.game_id)))){
  const b=row.bill,r=b?.result??{},me=b?.me??0,names=(b?.players??[]).map((p:any)=>p.name),id=String(row.game_id),net=Number(row.delta)||0;cumulative+=net;
  summary.push([id,time(row.at),row.mode==='solo'?'单人':'多人',row.round,r.kind??'',r.pattern??'',r.flip===null||r.flip===undefined?'不翻鸡':tile(r.flip),r.rooster===null||r.rooster===undefined?'无':tile(r.rooster),r.winner===me?'胡牌':r.readyInfo?.[me]?.ready?'听牌':'未听牌',net,cumulative]);
  for(const e of settlementLedger(b).items){if(e.from!==me&&e.to!==me)continue;const receiving=e.to===me;details.push([id,time(row.at),row.round,receiving?'收入':'扣分',names[receiving?e.from:e.to]??'牌友','积分收付',e.reason??'',Number(e.points)||0,receiving?Number(e.points)||0:-(Number(e.points)||0)])}
 }
 table(w,'对局总览',['对局编号','结束时间（北京时间）','模式','局数','胡牌方式','牌型','翻出的牌','本局翻鸡','听胡状态','本局实际盈亏','导出账单累计盈亏'],summary,[40,24,12,10,16,30,14,14,16,18,22]);
 table(w,'收付明细',['对局编号','结束时间（北京时间）','局数','收入／扣分','对方昵称','项目','具体原因','收付分数','实际增减'],details,[40,24,10,14,20,16,65,14,14]);
 return w;
}
export async function downloadExcel(w:ExcelJS.Workbook,name:string){const bytes=await w.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
