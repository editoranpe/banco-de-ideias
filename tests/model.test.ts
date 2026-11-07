import { strict as assert } from 'node:assert';
import { canRead,canEdit,score,generatePRD,promptFor,type Idea } from '../lib/model.ts';
for(const user of ['admin','a','b'])for(const owner of ['admin','a','b']){
 assert.equal(canRead(user,'admin',owner),user==='admin'||user===owner||owner==='admin',`read ${user}/${owner}`);
 assert.equal(canEdit(user,'admin',owner),user==='admin'||user===owner,`write ${user}/${owner}`);
}
assert.equal(score({scores:{}}),null);
const scores=Object.fromEntries(['pain','frequency','reach','cost'].map(k=>[k,{value:4,reason:'evidência'}]));
assert.equal(score({scores}),4);scores.cost.reason='';assert.equal(score({scores}),null);
const idea:Idea={id:'test',ownerId:'a',ownerName:'Autor',title:'Agenda',description:'Organizar atividades',answers:{audience:'Prestadores',pain:'Urgências',outcome:'Prioridades',features:'Conectar Google Agenda'},scores:{},sources:[],links:[],status:'draft',archived:0,revision:1,prd:'',versions:[],approvedRevision:null,createdAt:'',updatedAt:''};
const prd=generatePRD(idea);assert.match(prd,/Google Agenda/);assert.match(prd,/Pesquisa automática não configurada/);assert.match(prd,/Critério de aceitação: a definir/);
idea.prd='rascunho alterado';idea.approvedRevision=2;idea.versions=[{id:'2',number:1,content:'VERSÃO APROVADA',approved:true,date:''}];
for(const tool of ['Claude Code','Codex','Google AI Studio']){const p=promptFor(idea,tool,false);assert.match(p,/VERSÃO APROVADA/);assert.ok(!p.includes('rascunho alterado'));assert.ok(p.includes(tool));}
assert.match(promptFor(idea,'Codex',true),/projeto existente/);
console.log('OK: 18 autorizações; avaliação incompleta; PRD sem evidência inventada; 3 destinos usam a versão aprovada.');
