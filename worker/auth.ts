export interface Env { DB?:D1Database; ASSETS:Fetcher; ADMIN_EMAIL?:string; ACCESS_TEAM_DOMAIN?:string; ACCESS_AUD?:string }
export class AuthError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status;} }
type Jwk=JsonWebKey&{kid?:string};
const cache=new Map<string,{expires:number;keys:Jwk[]}>();
function decode(s:string){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('base64');const bin=atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='));return Uint8Array.from(bin,c=>c.charCodeAt(0));}
export async function validateToken(token:string,issuer:string,audience:string,keys:Jwk[],now=Math.floor(Date.now()/1000)){
 const parts=token.split('.');if(parts.length!==3)throw Error('token');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0])));const payload=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('algorithm');
 const jwk=keys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk)throw Error('key');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('signature');
 if(payload.iss!==issuer||!Array.isArray(payload.aud)||!payload.aud.includes(audience)||typeof payload.exp!=='number'||payload.exp<=now||typeof payload.iat!=='number'||payload.iat>now+30||(payload.nbf!==undefined&&(typeof payload.nbf!=='number'||payload.nbf>now+30)))throw Error('claims');
 if(typeof payload.sub!=='string'||!payload.sub||typeof payload.email!=='string'||!payload.email.includes('@'))throw Error('identity');
 return {userId:payload.sub,email:payload.email.toLowerCase(),fullName:null as string|null};
}
export async function verifyAccess(req:Request,env:Env){
 const team=env.ACCESS_TEAM_DOMAIN?.trim().replace(/^https:\/\//,'').replace(/\/$/,'');const audience=env.ACCESS_AUD?.trim();
 if(!team||!audience||!/^[-a-z0-9]+\.cloudflareaccess\.com$/.test(team))throw new AuthError(503,'Configuração pendente: defina ACCESS_TEAM_DOMAIN e ACCESS_AUD no Worker.');
 const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token||token.length>20000)throw new AuthError(401,'Entre pelo Cloudflare Access para continuar.');
 const issuer='https://'+team;
 try{
  let stored=cache.get(issuer);
  if(!stored||stored.expires<Date.now()){
   const r=await fetch(issuer+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error('certs');
   const data=await r.json() as {keys:Jwk[]};if(!Array.isArray(data.keys)||data.keys.length>50)throw Error('jwks');
   stored={expires:Date.now()+300000,keys:data.keys};cache.set(issuer,stored);
  }
  return await validateToken(token,issuer,audience,stored.keys);
 }catch{throw new AuthError(401,'Sua sessão não pôde ser validada. Entre novamente pelo Cloudflare Access.');}
}
