import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const action=process.argv[2];
const original='dist/server/wrangler.json',configured='dist/server/wrangler.deploy.json';
if(!existsSync(original))throw new Error('先运行 npm run build。');
function generate(local=false){
 const base=JSON.parse(readFileSync(original,'utf8'));
 base.d1_databases.forEach(x=>x.migrations_dir='../../drizzle');
 if(local){const dest='dist/server/wrangler.local.json';writeFileSync(dest,JSON.stringify(base,null,2)+'\n');return dest}
 if(!existsSync('deploy.config.json'))throw new Error('将 deploy.config.example.json 复制为 deploy.config.json，并填写你自己的 Worker、D1、R2 信息。');
 const c=JSON.parse(readFileSync('deploy.config.json','utf8'));
 if(!/^[a-z0-9][a-z0-9-]{0,62}$/.test(c.workerName??'')||!c.databaseName||!c.bucketName||!c.accountId||!c.databaseId)throw new Error('部署配置缺失或 Worker 名称无效。');
 if(c.databaseId==='00000000-0000-4000-8000-000000000000'||c.accountId==='YOUR_CLOUDFLARE_ACCOUNT_ID')throw new Error('不能用示例账号或数据库 ID 部署。');
 base.name=c.workerName;base.account_id=c.accountId;
 base.d1_databases=[{binding:'DB',database_name:c.databaseName,database_id:c.databaseId,migrations_dir:'../../drizzle'}];
 base.r2_buckets=[{binding:'BUCKET',bucket_name:c.bucketName}];
 writeFileSync(configured,JSON.stringify(base,null,2)+'\n');return configured;
}
let args;
if(action==='configure'){console.log(generate());process.exit(0)}
if(action==='migrate-local')args=['d1','migrations','apply','DB','--local','--config',generate(true),'--persist-to','.wrangler/state'];
else if(action==='migrate-remote')args=['d1','migrations','apply','DB','--remote','--config',generate()];
else if(action==='deploy')args=['deploy','--config',generate()];
else if(action==='dry-run')args=['deploy','--config',generate(),'--dry-run'];
else if(action==='seed-local')args=['d1','execute','DB','--local','--config',generate(true),'--persist-to','.wrangler/state','--file','db/seed-public-releases.sql'];
else if(action==='seed-remote')args=['d1','execute','DB','--remote','--config',generate(),'--file','db/seed-public-releases.sql'];
else throw new Error('Unknown action');
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});
if(r.error)throw r.error;process.exit(r.status??1);
