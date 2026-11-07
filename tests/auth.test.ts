import assert from 'node:assert/strict';
import { validateToken,verifyAccess,type Env } from '../worker/auth.ts';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const key={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
const issuer='https://test.cloudflareaccess.com';const now=Math.floor(Date.now()/1000);
const enc=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(overrides:Record<string,unknown>={}){const h=enc({alg:'RS256',kid:'test'});const p=enc({iss:issuer,aud:['aud'],sub:'admin-id',email:'admin@example.test',exp:now+300,iat:now,...overrides});const data=h+'.'+p;const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data));return data+'.'+Buffer.from(sig).toString('base64url')}
const valid=await token();assert.equal((await validateToken(valid,issuer,'aud',[key],now)).userId,'admin-id');
for(const overrides of [{exp:now-1},{aud:['wrong']},{iss:'https://evil.test'},{sub:''},{email:''},{iat:now+1000},{nbf:now+1000}])await assert.rejects(()=>token(overrides).then(t=>validateToken(t,issuer,'aud',[key],now)));
const parts=valid.split('.');parts[1]=enc({iss:issuer,aud:['aud'],email:'hacker@example.test',sub:'hacker',exp:now+300,iat:now});await assert.rejects(()=>validateToken(parts.join('.'),issuer,'aud',[key],now));
await assert.rejects(()=>validateToken(valid,issuer,'aud',[],now));
await assert.rejects(()=>verifyAccess(new Request('https://test/api/data',{headers:{'oai-authenticated-user-id':'admin','Cf-Access-Authenticated-User-Email':'admin@example.test'}}),{ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',ACCESS_AUD:'aud'} as Env));
console.log('OK: JWT válido, assinatura adulterada, expiração, audiência, emissor, identidade, nbf/iat e cabeçalhos falsificados.');
