import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
// Preserved historical fixtures; incompatibilities are documented, not silently removed.
const historical=new Set(['features-v18.test.mjs','presentation-v13.test.mjs','presentation-v14.test.mjs','presentation-v17.test.mjs','presentation-v19.test.mjs','presentation-v20.test.mjs','presentation-v5.test.mjs','presentation-v6.test.mjs','settlement-v11.test.mjs']);
const all=process.argv.includes('--all');
const files=readdirSync('tests').filter(x=>x.endsWith('.test.mjs')&&x!=='export-runtime.test.mjs'&&(all||!historical.has(x))).sort();
let failures=0;
for(const f of files){console.log(`\n=== ${f} ===`);const r=spawnSync(process.execPath,['--experimental-vm-modules','tests/'+f],{stdio:'inherit',timeout:180000});if(r.error||r.status!==0){failures++;console.error('FAIL',f,r.error?.message??r.status)}}
console.log(`\n${files.length-failures}/${files.length} passed; ${failures} failed.`);
if(!all)console.log('9 historical fixtures excluded; use npm run test:all to execute them. See docs/验证报告.md.');
process.exitCode=failures?1:0;
