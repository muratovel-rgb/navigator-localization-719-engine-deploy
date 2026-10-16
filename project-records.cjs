(function(root){
'use strict';
const T=typeof module!=='undefined'&&module.exports?require('./tpp52-dossier.cjs'):root.Tpp52Dossier;
const index=typeof module!=='undefined'&&module.exports?require('./pp719-index.json'):root.PP719IndexData;
const TYPE='dossier-project',SCHEMA=1;
const clone=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const text=(v,max=5000)=>typeof v==='string'&&v.length<=max;
const nonempty=(v,max=5000)=>text(v,max)&&v.trim().length>0;
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const time=v=>typeof v==='string'&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString()===v;
const demand=(v,message)=>{if(!v)throw Error(message);};
const isProject=v=>v?.recordType===TYPE;
function metadata(p){return clone({name:p.name,date:p.date,target:p.target,manufacturer:p.manufacturer,notes:p.notes,product:p.product,variants:p.variants,positions:p.positions});}
function validMetadata(m){
  return m&&nonempty(m.name,500)&&date(m.date)&&date(m.target)&&text(m.manufacturer,500)&&text(m.notes)&&m.product&&nonempty(m.product.name,500)&&text(m.product.okpd2,30)&&(!m.product.okpd2||/^\d{2}(?:\.\d{1,2}){0,2}(?:\.\d{3})?$/.test(m.product.okpd2))&&['designation','tu','purpose','characteristics'].every(k=>text(m.product[k]))&&
    Array.isArray(m.variants)&&m.variants.length>0&&m.variants.length<=100&&new Set(m.variants.map(v=>v.id)).size===m.variants.length&&new Set(m.variants.map(v=>v.label)).size===m.variants.length&&m.variants.every(v=>id(v.id)&&nonempty(v.label,120))&&
    Array.isArray(m.positions)&&m.positions.length<=100&&new Set(m.positions.map(v=>v.positionId)).size===m.positions.length&&m.positions.every(p=>id(p.positionId)&&p.status==='CANDIDATE'&&['title','codeText','section','sourceSnapshotDate'].every(k=>text(p[k]))&&typeof p.source==='string'&&/^https?:\/\//.test(p.source));
}
function valid(p){
  try{
    if(!isProject(p)||p.projectSchemaVersion!==SCHEMA||!id(p.id)||Object.hasOwn(p,'entryId')||!validMetadata(p)||!T.validOptional(p))return false;
    const variants=new Set(p.variants.map(v=>v.id));
    if(p.tpp52 && (!p.tpp52.documents.every(d=>d.versions.every(v=>v.scope.every(s=>variants.has(s))))||!p.tpp52.remarks.every(r=>r.scope.every(s=>variants.has(s)))))return false;
    if(p.tpp52&&[...(p.tpp52.requests||[]),...(p.tpp52.origins||[]),...(p.tpp52.packages||[]),...(p.tpp52.officialEvents||[]),...(p.tpp52.requirements||[])].some(x=>!x.scope.every(s=>variants.has(s))))return false;
    if(!Array.isArray(p.projectHistory)||p.projectHistory.length<1||p.projectHistory.length>200||new Set(p.projectHistory.map(h=>h.id)).size!==p.projectHistory.length)return false;
    let previous=null;
    for(let i=0;i<p.projectHistory.length;i++){
      const h=p.projectHistory[i];
      if(!h||!id(h.id)||h.revision!==i+1||!time(h.at)||!nonempty(h.actor,200)||!validMetadata(h.snapshot)||(previous&&h.at<previous.at))return false;
      if(previous&&!previous.snapshot.variants.every(v=>h.snapshot.variants.some(n=>n.id===v.id)))return false;
      previous=h;
    }
    if(p.tpp52?.packages?.some(k=>!p.projectHistory[k.projectRevision-1]||canonical(k.projectSnapshot)!==canonical(p.projectHistory[k.projectRevision-1].snapshot)))return false;
    return p.revision===p.projectHistory.length&&canonical(metadata(p))===canonical(previous.snapshot);
  }catch{return false;}
}
function positionSnapshot(positionId,previous=[]){
  const p=index.positions.find(p=>p.id===positionId);
  if(!p){const old=previous.find(p=>p.positionId===positionId);demand(old,'Позиция отсутствует в текущем индексе');return clone(old);}
  return {positionId:p.id,title:p.title,codeText:p.codeText,section:p.section,source:p.source,sourceSnapshotDate:p.sourceSnapshotDate||'',status:'CANDIDATE'};
}
function create(projectId,fields,event){
  demand(id(projectId)&&id(event?.id)&&time(event.at)&&nonempty(event.actor,200),'Укажи автора и дату записи');
  const p={recordType:TYPE,projectSchemaVersion:SCHEMA,id:projectId,...clone(fields),revision:1,tpp52:T.create(projectId),projectHistory:[]};
  demand(validMetadata(p),'Проверь карточку, код и исполнения проекта');
  p.projectHistory.push({id:event.id,revision:1,at:event.at,actor:event.actor,snapshot:metadata(p)});
  demand(valid(p),'Не удалось создать карточку проекта');return p;
}
function update(project,fields,event){
  demand(valid(project),'Карточка проекта не прошла проверку');
  demand(id(event?.id)&&time(event.at)&&nonempty(event.actor,200),'Укажи автора и дату записи');
  demand(!project.projectHistory.some(h=>h.id===event.id),'Такая запись уже существует');
  demand(event.at>=project.projectHistory.at(-1).at && (!project.tpp52?.events.length||event.at>=project.tpp52.events.at(-1).at),'Дата новой записи раньше предыдущей');
  const next={...clone(project),...metadata(fields)};
  demand(validMetadata(next),'Проверь карточку, код и исполнения проекта');
  demand(project.variants.every(v=>next.variants.some(n=>n.id===v.id)),'Удаление исполнения с историей не допускается');
  const oldBasis={date:project.date,product:project.product,manufacturer:project.manufacturer,variants:project.variants,positions:project.positions};
  const newBasis={date:next.date,product:next.product,manufacturer:next.manufacturer,variants:next.variants,positions:next.positions};
  if(canonical(oldBasis)!==canonical(newBasis)&&next.tpp52){
    for(const [i,r] of next.tpp52.remarks.entries())next.tpp52=T.apply(next.tpp52,{id:event.id+'-recheck-'+i,at:event.at,actor:event.actor,type:'remark.reopen',payload:{remarkId:r.id,reason:'Изменились изделие, изготовитель, исполнения или позиции для проверки. Нужна повторная проверка.'}});
    if(next.tpp52.requests?.length||next.tpp52.origins?.length||next.tpp52.requirements?.length)next.tpp52=T.apply(next.tpp52,{id:event.id+'-workflow',at:event.at,actor:event.actor,type:'workflow.recheck',payload:{reason:'Изменились исходные сведения проекта. Повтори проверку требований, запросов и происхождения.'}});
  }
  next.revision++;
  next.projectHistory.push({id:event.id,revision:next.revision,at:event.at,actor:event.actor,snapshot:metadata(next)});
  demand(valid(next),'Не удалось сохранить изменения проекта');return next;
}
function installValidator(engine){
  const previous=engine.validateImport;
  engine.validateImport=value=>{
    try{
      if(!value||value.formatVersion!==2||!Array.isArray(value.assessments)||value.assessments.length>100||!Array.isArray(value.history))return false;
      const projects=value.assessments.filter(isProject),regular=value.assessments.filter(a=>!isProject(a));
      return projects.every(valid)&&previous({...value,assessments:regular});
    }catch{return false;}
  };
  return()=>{engine.validateImport=previous;};
}
function calculationStatus(p){demand(valid(p),'Некорректный проект');return {available:false,reason:'NO_PREPARED_RULE',points:null,threshold:null,compliance:'NOT_EVALUATED'};}
const api={TYPE,SCHEMA,isProject,metadata,valid,create,update,positionSnapshot,installValidator,calculationStatus};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NavigatorProjects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
