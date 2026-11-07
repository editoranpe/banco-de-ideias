import { eq, or, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { verifyAccess, AuthError, type Env } from '../worker/auth';
import { ideas, settings, members } from '../db/schema';
import { canEdit, canRead, generatePRD, type Idea } from './model';
import { z } from 'zod';
export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
export const urlSchema=z.string().url().max(2000).refine(v=>{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password},'Use links HTTP ou HTTPS sem credenciais.');
const answerSchema=z.record(z.string().max(80),z.string().max(6000));
const sourceSchema=z.object({title:z.string().min(1).max(200),url:urlSchema,note:z.string().max(4000),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export const createSchema=z.object({title:z.string().trim().min(3).max(140),description:z.string().trim().min(10).max(15000),links:z.array(urlSchema).max(20).default([]),answers:answerSchema.optional()});
export const updateSchema=z.object({revision:z.number().int().positive(),action:z.enum(['save','generate','approve','archive','restore']).default('save'),answers:answerSchema.optional(),scores:z.record(z.enum(['pain','frequency','reach','cost']),z.object({value:z.number().int().min(0).max(5),reason:z.string().max(2000)})).optional(),sources:z.array(sourceSchema).max(30).optional(),prd:z.string().max(100000).optional(),status:z.enum(['registered','investigation','review']).optional()});
export function application(req:Request,env:Env){
async function context(){
 if(!env.DB)throw new ApiError(503,'Configuração pendente: vincule o banco D1 com o nome DB.');
 if(!env.ADMIN_EMAIL?.trim())throw new ApiError(503,'Configuração pendente: defina ADMIN_EMAIL.');
 const user=await verifyAccess(req,env);
 const db=drizzle(env.DB);
 const intended=user.email.toLowerCase()===env.ADMIN_EMAIL.trim().toLowerCase();
 if(intended)await db.insert(settings).values({key:'founder',value:user.userId}).onConflictDoNothing();
 const founder=(await db.select().from(settings).where(eq(settings.key,'founder')))[0]?.value;
 if(!founder)throw new ApiError(403,'O administrador precisa entrar primeiro para inicializar o aplicativo.');
 const admin=user.userId===founder;
 if(!admin){const member=(await db.select().from(members).where(eq(members.email,user.email.toLowerCase())))[0];if(!member?.active)throw new ApiError(403,'Sua conta ainda não foi autorizada pelo administrador.');}
 return {db,user,founder,admin};
}
function decode(row:typeof ideas.$inferSelect):Idea{return {...row,links:JSON.parse(row.links),answers:JSON.parse(row.answers),scores:JSON.parse(row.scores),sources:JSON.parse(row.sources),versions:JSON.parse(row.versions)}}
async function listData(){const c=await context();const rows=await c.db.select().from(ideas).where(c.admin?undefined:or(eq(ideas.ownerId,c.user.userId),eq(ideas.ownerId,c.founder)));
 return {user:{id:c.user.userId,name:c.user.fullName||c.user.email.split('@')[0],email:c.user.email,admin:c.admin},ideas:rows.map(r=>({...decode(r),canEdit:canEdit(c.user.userId,c.founder,r.ownerId)})),members:c.admin?await c.db.select().from(members):[],mode:'guided'};
}
async function loadIdea(id:string,edit=false){const c=await context();const row=(await c.db.select().from(ideas).where(eq(ideas.id,id)))[0];if(!row||!canRead(c.user.userId,c.founder,row.ownerId))throw new ApiError(404,'Ideia não encontrada.');if(edit&&!canEdit(c.user.userId,c.founder,row.ownerId))throw new ApiError(403,'Somente o autor e o administrador podem editar esta ideia.');return {...c,idea:decode(row)};}
async function updateIdea(id:string,body:unknown){const input=updateSchema.parse(body);const c=await loadIdea(id,true);const old=c.idea;if(old.revision!==input.revision)throw new ApiError(409,'Esta ideia mudou em outra sessão. Reabra a ideia antes de continuar.');
 const next={...old,answers:input.answers??old.answers,scores:input.scores??old.scores,sources:input.sources??old.sources,prd:input.prd??old.prd,status:input.status??old.status};
 const contentChanged=JSON.stringify(next.answers)!==JSON.stringify(old.answers)||JSON.stringify(next.scores)!==JSON.stringify(old.scores)||JSON.stringify(next.sources)!==JSON.stringify(old.sources)||next.prd!==old.prd;
 if(contentChanged){next.approvedRevision=null;next.status=next.prd?'draft':next.status;}
 if(next.prd!==old.prd&&input.action==='save'){next.versions=[...old.versions,{id:String(old.revision+1),date:new Date().toISOString(),content:next.prd,number:old.versions.length+1,approved:false}];}
 if(input.action==='generate'){
  if(!next.answers.audience?.trim()||!next.answers.pain?.trim()||!next.answers.outcome?.trim()||!next.answers.features?.trim())throw new ApiError(400,'Preencha público, problema, resultado e funcionalidades antes de montar o PRD.');
  next.prd=generatePRD(next);next.status='draft';next.approvedRevision=null;
  next.versions=[...old.versions,{id:String(old.revision+1),date:new Date().toISOString(),content:next.prd,number:old.versions.length+1,approved:false}];
 }
 if(input.action==='approve'){
  if(!next.prd.trim())throw new ApiError(400,'Monte e revise o PRD antes de aprovar.');
  const v={id:String(old.revision+1),date:new Date().toISOString(),content:next.prd,number:old.versions.length+1,approved:true};next.versions=[...old.versions,v];next.status='approved';next.approvedRevision=old.revision+1;
 }
 if(input.action==='archive')next.archived=1;if(input.action==='restore')next.archived=0;
 const saved=await c.db.update(ideas).set({answers:JSON.stringify(next.answers),scores:JSON.stringify(next.scores),sources:JSON.stringify(next.sources),prd:next.prd,status:next.status,archived:next.archived,approvedRevision:next.approvedRevision,versions:JSON.stringify(next.versions),revision:old.revision+1,updatedAt:new Date().toISOString()}).where(and(eq(ideas.id,id),eq(ideas.revision,old.revision))).returning();
 if(!saved.length)throw new ApiError(409,'Outra edição foi salva. Reabra a ideia para evitar sobrescrever alterações.');return {...decode(saved[0]),canEdit:true};
}
return {context,decode,listData,loadIdea,updateIdea};
}
export function mutationGuard(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new ApiError(403,'Origem da solicitação inválida.');if(!req.headers.get('content-type')?.includes('application/json'))throw new ApiError(415,'Formato de solicitação inválido.');}
export async function body(req:Request){const text=await req.text();if(text.length>200000)throw new ApiError(413,'Conteúdo muito extenso.');try{return JSON.parse(text)}catch{throw new ApiError(400,'Conteúdo inválido.')}}
export function response(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
export function failure(e:unknown){if(e instanceof ApiError||e instanceof AuthError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues.map(i=>i.message).slice(0,2).join(' ')},400);console.error('Application operation failed',e instanceof Error?e.name:'Unknown');return response({error:'Não foi possível concluir. Seus dados anteriores continuam salvos. Tente novamente.'},500)}
