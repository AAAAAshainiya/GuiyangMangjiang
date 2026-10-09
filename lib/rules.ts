export const HU_FIELDS=[['ping','平胡'],['peng','大对子'],['kong','杠开'],['pure','清一色'],['seven','七对'],['dragon','龙七对'],['heaven','天听'],['single','单吊']] as const;
export type HuKey=typeof HU_FIELDS[number][0];
export type GameRules={chickenTiles:number[],chicken:number,charge:number,flip:number,ming:number,an:number,bu:number,hot:number,hu:Record<HuKey,number>};
export const POINT_FIELDS=[['chicken','普通固定鸡'],['charge','冲锋鸡'],['flip','翻牌鸡'],['ming','明杠豆分'],['an','暗杠豆分'],['bu','补杠豆分'],['hot','热炮额外付款']] as const;
export function defaultRules():GameRules{return {chickenTiles:[0,16,18],chicken:2,charge:4,flip:1,ming:4,an:4,bu:4,hot:4,hu:{ping:4,peng:8,kong:8,pure:16,seven:12,dragon:16,heaven:12,single:12}}}
// Accept only bounded integers and actual tile IDs. Server and editor share it.
export function validateRules(value:unknown):GameRules{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('计分规则格式不正确');
 const v=value as Record<string,any>,tiles=v.chickenTiles;
 if(!Array.isArray(tiles)||tiles.length>27||tiles.some(t=>!Number.isInteger(t)||t<0||t>26)||new Set(tiles).size!==tiles.length)throw new Error('固定鸡牌只能选择万、筒、条的有效牌，每种只选一次');
 const points=(n:any)=>{if(!Number.isInteger(n)||n<0||n>1000)throw new Error('分数必须是 0—1000 的整数');return n};
 if(!v.hu||typeof v.hu!=='object'||Array.isArray(v.hu))throw new Error('请填写全部胡牌牌型分数');
 const hu=Object.fromEntries(HU_FIELDS.map(([key])=>[key,points(v.hu[key])])) as Record<HuKey,number>;
 return {chickenTiles:[...tiles].sort((a,b)=>a-b),chicken:points(v.chicken),charge:points(v.charge),flip:points(v.flip),ming:points(v.ming),an:points(v.an),bu:points(v.bu),hot:points(v.hot),hu};
}
export function rulesEqual(a:GameRules,b:GameRules){return JSON.stringify(validateRules(a))===JSON.stringify(validateRules(b))}
