import { readFileSync,writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const id=process.env.D1_DATABASE_ID?.trim();
if(!id||!/^[a-f0-9-]{36}$/i.test(id))throw new Error('Configure D1_DATABASE_ID nas variáveis de build da Cloudflare com o ID do banco D1.');
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
config.d1_databases=[{binding:'DB',database_name:process.env.D1_DATABASE_NAME?.trim()||'banco-de-ideias',database_id:id,migrations_dir:'migrations'}];
writeFileSync('wrangler.deploy.json',JSON.stringify(config,null,2)+'\n');
function run(args){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
run(['d1','migrations','apply','DB','--remote','--config','wrangler.deploy.json']);
run(['deploy','--config','wrangler.deploy.json']);
