'use client';
import {useEffect,useRef,useState} from 'react';
import {defaultRules,validateRules,rulesEqual,HU_FIELDS,POINT_FIELDS,tileName,type GameRules} from '@/lib/game';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';

const group=(tiles:number[],label='')=>({tiles,label});
export const HU_EXAMPLES=[
 {key:'ping',name:'平胡',groups:[group([0,1,2],'顺子'),group([3,4,5],'顺子'),group([10,11,12],'顺子'),group([21,22,23],'顺子'),group([16,16],'对子')],hand:[0,1,2,3,4,5,10,11,12,21,22,23,16,16],melds:[],note:'四组加一对，没有其他特殊牌型。无杠只能自摸；有杠可接炮。'},
 {key:'peng',name:'大对子',groups:[group([0,0,0],'刻子'),group([3,3,3],'刻子'),group([10,10,10],'刻子'),group([21,21,21],'刻子'),group([16,16],'对子')],hand:[0,0,0,3,3,3,10,10,10,21,21,21,16,16],melds:[],note:'四组都是刻子或杠，再加一对。可接炮；单吊时不重复加大对子。'},
 {key:'kong',name:'杠开',groups:[group([0,0,0,0],'杠区'),group([3,4,5],'顺子'),group([10,11,12],'顺子'),group([21,22,23],'顺子'),group([16,16],'补摸8筒成对')],hand:[3,4,5,10,11,12,21,22,23,16,16],melds:[{t:0,k:'gang'}],note:'完成杠后，补摸的一张立即胡牌。属于自摸；普通顺子杠开只算杠开，不再加平胡。'},
 {key:'pure',name:'清一色',groups:[group([0,1,2]),group([3,4,5]),group([6,7,8]),group([1,2,3]),group([4,4])],hand:[0,1,2,3,4,5,6,7,8,1,2,3,4,4],melds:[],note:'手牌与碰杠全部只有一种花色。此例全是万，可接炮；可与其他成立的特殊牌型相加。'},
 {key:'seven',name:'七对',groups:[group([0,0]),group([2,2]),group([4,4]),group([10,10]),group([12,12]),group([18,18]),group([22,22])],hand:[0,0,2,2,4,4,10,10,12,12,18,18,22,22],melds:[],note:'不碰杠，十四张组成七个对子。可接炮。'},
 {key:'dragon',name:'龙七对',groups:[group([0,0,0,0],'四张相同'),group([4,4]),group([10,10]),group([12,12]),group([18,18]),group([22,22])],hand:[0,0,0,0,4,4,10,10,12,12,18,18,22,22],melds:[],note:'七对中含四张相同牌，四张可算两对。替代七对分，不重复加七对，也不按四张组数另加。'},
 {key:'heaven',name:'天听',groups:[group([0,1,2]),group([3,4,5]),group([10,11,12]),group([21,22,23]),group([16,16],'原有8筒＋胡进8筒')],hand:[0,1,2,3,4,5,10,11,12,21,22,23,16,16],melds:[],note:'最初发到的十三张已经听牌：此例起手只有一张8筒，听8筒。庄家额外第十四张不参与判定；可接炮，后续资格保留。'},
 {key:'single',name:'单吊',groups:[group([0,0,0],'已碰'),group([3,3,3],'已碰'),group([10,10,10],'已碰'),group([21,21,21],'已碰'),group([16,16],'手牌：8筒单吊')],hand:[16,16],melds:[{t:0,k:'peng'},{t:3,k:'peng'},{t:10,k:'peng'},{t:21,k:'peng'}],note:'四组已经碰或杠，手里只剩一张，等同牌配对。只算单吊，不加大对子；清一色、杠开、天听仍可相加。'}
] as const;
export function RuleTile({t}:{t:number}){return <span className="rule-tile"><img src={`/tiles/${t}.webp`} alt={tileName(t)} draggable={false}/><small>{tileName(t)}</small></span>}
function RuleTable({title,columns,rows}:{title:string,columns:string[],rows:any[][]}){return <section className="rule-table-section"><h3>{title}</h3><div className="rule-table-scroll" tabIndex={0} aria-label={title+'，窄屏可左右滚动'}><table className="rule-reference-table"><caption>{title}</caption><thead><tr>{columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></table></div></section>}
export function RuleTables({rules=defaultRules()}:{rules?:GameRules}){
 const r=rules,base=r.chicken,charge=r.charge,flip=r.flip,hu=r.hu,peng=hu.peng;
 return <div className="rule-tables">
 <RuleTable title="① 哪些牌是固定鸡" columns={['鸡牌牌面','名称／当前资格','普通鸡每张','冲锋鸡每张']} rows={r.chickenTiles.length?r.chickenTiles.map(t=>[<RuleTile key={t} t={t}/>,t===0||t===18?'幺鸡':t===16?'乌骨鸡':'自定义固定鸡',`${base} 分`,`${charge} 分`]):[['未设置固定鸡','本桌不产生固定鸡或冲锋鸡','0 分','0 分']]}/>
 <p className="rule-note">每种固定鸡全桌第一次打出为冲锋鸡，横放；替代普通鸡分，不是两者相加。被碰、杠或胡走后不再算原出牌者的弃牌鸡，冲锋资格不转移。翻鸡是结束时翻出牌的同花色下一点，9接1。</p>
 <RuleTable title="② 鸡牌在不同情况下，谁给谁多少" columns={['牌与情况','本人胡牌／听牌','本人未听牌','付款范围／例子']} rows={[
 ['普通固定鸡',`每张收 ${base} 分`,`仅自己打出的每张赔 ${base} 分；手牌和碰杠不赔`,'收鸡时另外三家各付；未听牌弃鸡只付给有收鸡资格的人。'],
 ['冲锋鸡',`每张收 ${charge} 分`,`自己打出的每张赔 ${charge} 分`,'只有仍在本人弃牌区的冲锋鸡算本人分数。'],
 ['只算翻鸡，未与固定鸡重合',`每张收 ${flip} 分`,'自己打出的也不收、不扣，0分；持有同样不计分',`例如翻出1万，2万是翻鸡；仅当2万未被选为固定鸡时，未听牌打出它为0分。`],
 ['翻鸡＋普通固定鸡',`每张收 ${base}＋${flip}＝${base+flip} 分`,`自己打出的每张赔 ${base+flip} 分`,`${base} 固定鸡＋${flip} 翻鸡，重合仍多计翻鸡部分。`],
 ['翻鸡＋冲锋鸡',`每张收 ${charge}＋${flip}＝${charge+flip} 分`,`自己打出的每张赔 ${charge+flip} 分`,`${charge} 冲锋鸡＋${flip} 翻鸡，不再加普通固定鸡分。`]
 ]}/>
 <p className="rule-note">收鸡资格＝本局结束时胡牌／听牌，且没有放热炮。双方有资格时互相抵扣；双方没资格时互不收弃鸡罚分。碰按3张、杠按4张计算，暗杠也算本人持有鸡，但牌面只向本人显示。</p>
 <RuleTable title="③ 胡牌牌型与牌面例子" columns={['牌型','本项分数','完整牌面示例','成立条件／叠加']} rows={HU_EXAMPLES.map(e=>[e.name,`${hu[e.key]} 分`,<div className="rule-example" key={e.key}>{e.groups.map((g,i)=><span className="rule-example-group" key={i}><span>{g.tiles.map((t,j)=><img key={j} src={`/tiles/${t}.webp`} alt={tileName(t)} draggable={false}/>)}</span>{g.label&&<small>{g.label}</small>}</span>)}</div>,e.note])}/>
 <p className="rule-note">这些是牌型示例，不是当前玩家的手牌。特殊牌型相加：清一色大对子 {hu.pure}＋{hu.peng}＝{hu.pure+hu.peng}；清一色单吊 {hu.pure}＋{hu.single}＝{hu.pure+hu.single}。平胡只在没有特殊牌型时计算；龙七对替代七对；单吊替代大对子。</p>
 <RuleTable title="④ 自摸、接炮、放炮：实际付多少" columns={['情况','谁付款','每家支付','胡分合计／例子']} rows={[
 ['自摸（含杠开）','另外三家各给赢家','各付牌型总分',`例如大对子：三家各付 ${peng}，赢家共收 ${peng*3} 分。`],
 ['接炮／普通放炮','仅放炮者给赢家','放炮者付牌型总分；其他两家0',`大对子放炮付 ${peng} 分。未听牌放炮仍付胡分。平胡无杠通常不能接炮。`],
 ['抢杠胡','仅被抢补杠者给赢家','付牌型总分，其他两家0','允许无杠平胡；被抢的补杠未完成，不计该次豆分。'],
 ['热炮','杠后补牌的第一张弃牌被胡，由放炮者付款',`牌型总分＋额外 ${r.hot} 分`,`大对子热炮付 ${peng}＋${r.hot}＝${peng+r.hot} 分；自己的鸡豆全部烧掉，仍付对方有效鸡豆。`]
 ]}/>
 <p className="rule-note">以上只列胡分付款，鸡豆另算。赢家自己的“胡”列为牌型总分，不是从三家收到的总额；最终赚亏＝实际胡净额＋豆净额＋鸡净额，四人合计为0。</p>
 <RuleTable title="⑤ 碰、明杠、暗杠、补杠：豆分" columns={['操作','谁付款','每家支付','杠者实际收入／自身豆值']} rows={[
 ['碰','无人','0 分','不产生豆分。'],
 ['明杠（用他人弃牌）','仅原出牌者',`${r.ming} 分`,`合计收 ${r.ming} 分；自身豆 ${r.ming}。`],
 ['暗杠（自己四张）','另外三家',`每家 ${r.an} 分`,`合计收 ${r.an*3} 分；自身豆 ${r.an}。`],
 ['补杠（碰后摸第四张）','另外三家',`每家 ${r.bu} 分`,`合计收 ${r.bu*3} 分；自身豆 ${r.bu}。`]
 ]}/>
 <p className="rule-note">只有杠者最终胡牌／听牌且未放热炮，这次豆才有效。付款方是否听牌不影响付款义务；杠者未听牌时取消自己的豆，不反向罚自己的豆。</p>
 <RuleTable title="⑥ 哪些项目不收、不扣" columns={['情况','取消哪些分','仍然要付什么']} rows={[
 ['未听牌，只打出非固定翻鸡','这张翻鸡0分','仍付他人的有效鸡豆和本人的放炮胡分。'],
 ['未听牌，鸡留在手牌／碰杠里','本人的持有鸡0分；本人的豆取消','自己的固定弃鸡仍赔有资格者；仍付他人的有效鸡豆。'],
 ['自己未听牌开杠','自己的所有豆收付取消','仍付其他有资格杠者的豆。'],
 ['放热炮','自己的手牌、碰杠、弃牌鸡与全部豆烧掉，不收也不倒付','仍付赢家胡分＋热炮额外分，以及其他有资格者的有效鸡豆。'],
 ['补杠被抢胡','该次补杠豆0分','被抢者仍付抢杠赢家牌型胡分。'],
 ['流局','全桌胡、鸡、豆都归0，不翻鸡','本局无人加分或扣分，累计分不变。']
 ]}/>
 </div>;
}
export function RuleEditor({rules,onSave,onCancel,busy=false}:{rules:GameRules,onSave:(r:GameRules)=>Promise<void>,onCancel:()=>void,busy?:boolean}){
 const [draft,setDraft]=useState<GameRules>(()=>validateRules(rules)),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const locked=busy||saving;
 function number(key:string,value:string,hu=false){const n=value===''?NaN:Number(value);setDraft(r=>hu?{...r,hu:{...r.hu,[key]:n}}:{...r,[key]:n});setError('')}
 async function save(){if(locked)return;try{const next=validateRules(draft);setSaving(true);setError('');await onSave(next)}catch(e){setError(e instanceof Error?e.message:'规则保存失败，请重试')}finally{setSaving(false)}}
 return <div className="rule-editor"><p className="rule-note">修改的是下一局规则。当前牌局和历史账单不会重新计分。所有分数可设为0，范围0—1000，必须是整数。</p>
 <fieldset disabled={locked}><legend>固定鸡牌 · 点击牌面选中或取消</legend><p>默认一万、一条为幺鸡，八筒为乌骨鸡。也可以选择其他牌作为固定鸡，或取消全部；未选中的牌不产生固定鸡和冲锋鸡。</p>{['万','筒','条'].map((suit,s)=><div className="rule-tile-picker" key={suit}><strong>{suit}</strong>{Array.from({length:9},(_,n)=>s*9+n).map(t=><button type="button" key={t} aria-label={tileName(t)+'固定鸡'} aria-pressed={draft.chickenTiles.includes(t)} onClick={()=>setDraft(r=>({...r,chickenTiles:r.chickenTiles.includes(t)?r.chickenTiles.filter(v=>v!==t):[...r.chickenTiles,t].sort((a,b)=>a-b)}))}><RuleTile t={t}/><span>{draft.chickenTiles.includes(t)?'已选':'未选'}</span></button>)}</div>)}</fieldset>
 <div className="rule-table-scroll"><table className="rule-reference-table rule-edit-table"><caption>各项计分数值</caption><thead><tr><th>项目</th><th>每张／每家分数</th></tr></thead><tbody>{HU_FIELDS.map(([key,label])=><tr key={key}><th scope="row">{label}</th><td><input type="number" inputMode="numeric" min={0} max={1000} step={1} disabled={locked} aria-label={label+'分数'} value={Number.isNaN(draft.hu[key])?'':draft.hu[key]} onChange={e=>number(key,e.target.value,true)}/></td></tr>)}{POINT_FIELDS.map(([key,label])=><tr key={key}><th scope="row">{label}</th><td><input type="number" inputMode="numeric" min={0} max={1000} step={1} disabled={locked} aria-label={label+'分数'} value={Number.isNaN(draft[key])?'':draft[key]} onChange={e=>number(key,e.target.value)}/></td></tr>)}</tbody></table></div>
 <p className="rule-note">胡牌分按牌型相加。鸡分按每张；明杠只由原出牌者支付，暗杠与补杠另外三家各付设置值。编辑分数不会改变胡牌、听牌、热炮和收分资格的成立条件。</p>
 {error&&<p className="rule-save-error" role="alert">{error}</p>}<div className="rule-editor-actions"><Button variant="outline" disabled={locked} onClick={onCancel}>取消</Button><Button className="primary-button" disabled={locked} onClick={()=>void save()}>{saving||busy?'正在保存／确认…':'保存，下一局生效'}</Button></div></div>;
}
export function RulesPublicPanel({room,busy,onSave,settled=true}:{room:any,busy:boolean,onSave:(rules:GameRules)=>Promise<void>,settled?:boolean}){
 const [viewing,setViewing]=useState(false),[editing,setEditing]=useState(false),[saved,setSaved]=useState(''),pendingSave=useRef<GameRules|null>(null),r:GameRules=room?.rules??defaultRules(),active:GameRules=room?.roundRules??r;
 const canEdit=!!room?.isHost&&['lobby','done'].includes(room.phase)&&settled,pending=room&&room.phase!=='lobby'&&((room.ruleRevision??1)!==(room.roundRuleRevision??1)||!rulesEqual(r,active));
 useEffect(()=>{if(pendingSave.current&&rulesEqual(r,pendingSave.current)){pendingSave.current=null;setEditing(false);setSaved('规则已保存，下一局生效；历史账单保持原分数。')}},[room?.ruleRevision,r]);
 return <section className="rules-public-card" aria-label="积分规则公示"><div className="rule-public-actions"><Button variant="outline" onClick={()=>setViewing(true)}>查看积分规则</Button><Button className="primary-button" disabled={!canEdit||busy} title={!room?'入座后由房主编辑。':!room.isHost?'仅房主可修改，所有玩家同步使用。':canEdit?'保存后下一局生效。':'本局结束并看完结算后可以修改。'} onClick={()=>{setSaved('');setEditing(true)}}>修改积分规则</Button></div>{saved&&<span className="sr-only" role="status">{saved}</span>}
 <Dialog open={viewing} onOpenChange={setViewing}><DialogContent className="rules-dialog"><DialogHeader><DialogTitle>积分规则</DialogTitle><DialogDescription>{room?'本桌规则 · 第 '+(room.ruleRevision??1)+' 版':'默认规则'}。鸡牌和分值与游戏共用设置，每局账单按开局时的规则结算。</DialogDescription></DialogHeader>{viewing&&<>
 {pending&&<p className="rule-change-note">已保存下一局规则；本局账单保留第 {room.roundRuleRevision??1} 版。下面公示的是下一局设置。</p>}
 {room&&room.phase!=='lobby'&&!room.flipPenaltyOnlyFixed&&<p className="rule-change-note">本局在新翻鸡规则上线前已开始，保留原计分；未听牌非固定翻鸡免扣从下一局生效。</p>}
 <RuleTables rules={r}/></>}</DialogContent></Dialog>
 <Dialog open={editing} onOpenChange={open=>{if(!busy){if(!open)pendingSave.current=null;setEditing(open)}}}><DialogContent className="rule-editor-dialog"><DialogHeader><DialogTitle>修改积分规则</DialogTitle><DialogDescription>仅房主可修改。保存后同步全桌，从下一局开始使用。</DialogDescription></DialogHeader>{editing&&<RuleEditor key={room?.code} rules={r} busy={busy} onCancel={()=>{pendingSave.current=null;setEditing(false)}} onSave={async next=>{pendingSave.current=next;await onSave(next);pendingSave.current=null;setEditing(false);setSaved('规则已保存，下一局生效；历史账单保持原分数。')}}/>}</DialogContent></Dialog>
 </section>;
}
