import { application,createSchema,body,mutationGuard,response,failure,ApiError } from '../lib/server';
import { ideas,members } from '../db/schema';
import type { Env } from './auth';
import { z } from 'zod';
export default {async fetch(req:Request,env:Env):Promise<Response>{
 const url=new URL(req.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{
  const app=application(req,env);
  if(req.method==='GET'&&url.pathname==='/api/data')return response(await app.listData());
  mutationGuard(req);
  if(req.method==='POST'&&url.pathname==='/api/ideas'){
   const input=createSchema.parse(await body(req));const c=await app.context();const now=new Date().toISOString();
   const [row]=await c.db.insert(ideas).values({id:crypto.randomUUID(),ownerId:c.user.userId,ownerName:c.user.fullName||c.user.email.split('@')[0],title:input.title,description:input.description,links:JSON.stringify(input.links),answers:JSON.stringify(input.answers||{}),createdAt:now,updatedAt:now}).returning();return response({...app.decode(row),canEdit:true},201);
  }
  const match=url.pathname.match(/^\/api\/ideas\/([a-f0-9-]{36})$/);
  if(req.method==='PATCH'&&match)return response(await app.updateIdea(match[1],await body(req)));
  if(req.method==='POST'&&url.pathname==='/api/members'){
   const c=await app.context();if(!c.admin)throw new ApiError(403,'Apenas o administrador pode gerenciar sócios.');
   const input=z.object({email:z.string().email().max(250),name:z.string().min(2).max(100),active:z.number().int().min(0).max(1)}).parse(await body(req));
   if(input.email.toLowerCase()===c.user.email)throw new ApiError(400,'O administrador já tem acesso.');
   await c.db.insert(members).values({...input,email:input.email.toLowerCase()}).onConflictDoUpdate({target:members.email,set:{name:input.name,active:input.active}});return response({ok:true});
  }
  return response({error:'Rota não encontrada.'},404);
 }catch(e){return failure(e)}
}};
