import {db} from '@/db';
import {CURRENT_VERSION,CURRENT_ACTIVITY,RELEASE_PUBLIC_KEY} from '@/lib/release-config';
import {RELEASE_HISTORY,type ReleaseRecord} from '@/lib/release-history';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 try{
  const rows=await db().prepare('SELECT version, deployed_at AS deployedAt, activity, commit_sha AS "commit" FROM mahjong_releases WHERE version <= ? ORDER BY version').bind(CURRENT_VERSION).all<ReleaseRecord>();
  const records=new Map(RELEASE_HISTORY.map(r=>[r.version,r]));
  for(const row of rows.results)if(row.version>29)records.set(row.version,row);
  return reply({currentVersion:CURRENT_VERSION,records:[...records.values()].sort((a,b)=>a.version-b.version)});
 }catch{return reply({error:'版本记录暂时加载失败，请重试'},503)}
}
export async function POST(req:Request){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return reply({error:'来源不正确'},403);
 if(Number(req.headers.get('content-length')??0)>2048)return reply({error:'请求过大'},413);
 try{
  const text=await req.text();if(text.length>2048)return reply({error:'请求过大'},413);
  const {version,deployedAt,commit,signature}=JSON.parse(text);
  if(version!==CURRENT_VERSION||typeof deployedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(deployedAt)||!Number.isFinite(Date.parse(deployedAt))||typeof commit!=='string'||!/^\w{40}$/.test(commit)||!/^[a-f0-9]{40}$/.test(commit)||typeof signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(signature))return reply({error:'发布记录不正确'},400);
  const key=await crypto.subtle.importKey('jwk',RELEASE_PUBLIC_KEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const bytes=Uint8Array.from(atob(signature),c=>c.charCodeAt(0));
  const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes,new TextEncoder().encode(JSON.stringify([version,deployedAt,commit])));
  if(!valid)return reply({error:'发布签名不正确'},403);
  await db().prepare('INSERT INTO mahjong_releases (version, deployed_at, activity, commit_sha) VALUES (?, ?, ?, ?) ON CONFLICT(version) DO NOTHING').bind(version,deployedAt,CURRENT_ACTIVITY,commit).run();
  const record=await db().prepare('SELECT version, deployed_at AS deployedAt, activity, commit_sha AS "commit" FROM mahjong_releases WHERE version = ?').bind(version).first<ReleaseRecord>();
  if(!record||record.commit!==commit||record.deployedAt!==deployedAt)return reply({error:'该版本已有其他发布记录'},409);
  return reply({saved:true,record});
 }catch{return reply({error:'发布记录保存失败'},400)}
}
