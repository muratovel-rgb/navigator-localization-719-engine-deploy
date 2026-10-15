(function(root){
'use strict';
const P=root.NavigatorProjects;
const n=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const uid=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
function input(label,id,value='',type='text'){
  const l=n('label',label),e=n(type==='textarea'?'textarea':'input');e.id=id;e.value=value;e.maxLength=5000;if(type!=='textarea')e.type=type;l.append(e);return {node:l,input:e};
}
function draft(seed={}){
  const position=seed.positionId?P.positionSnapshot(seed.positionId):null;
  return {id:uid('project'),name:seed.name||position?.title||'',date:today(),target:today(),manufacturer:'',notes:'',product:{name:seed.productName||position?.title||'',okpd2:seed.okpd2||'',designation:'',tu:'',purpose:'',characteristics:''},variants:[{id:uid('variant'),label:''}],positions:position?[position]:[]};
}
function render(project,options){
  const box=document.getElementById('project-editor');box.replaceChildren();
  const saved=P.isProject(project),form=n('form',undefined,'tpp-form');
  const fields={};
  for(const [key,label,value,type]of [
    ['name','Название проекта',project.name],['manufacturer','Заявитель / изготовитель',project.manufacturer],['date','Дата оценки',project.date,'date'],['target','Целевая дата',project.target,'date'],
    ['productName','Наименование продукции',project.product.name],['okpd2','ОКПД2, если известен',project.product.okpd2],['designation','Обозначение продукции',project.product.designation],['tu','ТУ или другой документ производства',project.product.tu],['purpose','Назначение',project.product.purpose,'textarea'],['characteristics','Характеристики для выбора позиции',project.product.characteristics,'textarea'],['notes','Примечания проекта',project.notes,'textarea'],['actor','Кто вносит запись','']]){
    const f=input(label,'project-'+key,value,type);fields[key]=f.input;form.append(f.node);
  }
  form.append(n('p','Изменения карточки сохраняются кнопкой в конце формы. Документы и замечания ведутся после создания проекта.','small'),n('h3','Исполнения проекта'));
  const variantInputs=project.variants.map(v=>{const f=input('Исполнение','project-variant-'+v.id,v.label);f.input.maxLength=120;form.append(f.node);return {id:v.id,input:f.input};});
  const extra=input('Добавить исполнения, по одному в строке','project-new-variants','','textarea');form.append(extra.node);
  const candidates=n('section');candidates.append(n('h3','Позиции №719 для проверки'));
  candidates.append(n('p','Связь с позицией сохраняет кандидата. Она не подтверждает применимость требований и не назначает маршрут СТ-1.','small'));
  const query=input('Найти позицию по коду или названию','project-position-query',project.product.okpd2||project.product.name),find=n('button','Найти позиции');find.type='button';
  const results=n('div'),selected=new Set(project.positions.map(p=>p.positionId));candidates.append(query.node,find,results);form.append(candidates);
  function showCandidates(){
    results.replaceChildren();const all=root.Registry719.search(query.input.value),visible=all.slice(0,50),ids=new Set(visible.map(p=>p.id));
    for(const p of project.positions)if(!ids.has(p.positionId))visible.unshift({id:p.positionId,title:p.title,codeText:p.codeText,source:p.source});
    results.append(n('p',all.length?'Найдено '+all.length+'. Показаны первые 50 и ранее связанные позиции.':'Совпадений в доступном индексе нет. Это не означает отсутствия требований №719.','small'));
    for(const p of visible){const l=n('label',undefined,'check'),check=n('input');check.type='checkbox';check.value=p.id;check.checked=selected.has(p.id);check.addEventListener('change',()=>{options.dirty?.();if(check.checked)selected.add(p.id);else selected.delete(p.id);});l.append(check,document.createTextNode(p.codeText+' · '+p.title));results.append(l);}
  }
  find.addEventListener('click',showCandidates);showCandidates();
  const submit=n('button',saved?'Сохранить изменения карточки':'Создать проект','primary');submit.type='submit';form.append(submit);
  form.addEventListener('submit',e=>{e.preventDefault();try{
    const variants=variantInputs.map(v=>({id:v.id,label:v.input.value.trim()})).filter(v=>saved||v.label);
    for(const label of extra.input.value.split('\n').map(x=>x.trim()).filter(Boolean))variants.push({id:uid('variant'),label});
    if(new Set(variants.map(v=>v.label)).size!==variants.length)throw Error('Названия исполнений должны различаться');
    const f={name:fields.name.value.trim(),manufacturer:fields.manufacturer.value.trim(),date:fields.date.value,target:fields.target.value,notes:fields.notes.value.trim(),product:{name:fields.productName.value.trim(),okpd2:fields.okpd2.value.trim(),designation:fields.designation.value.trim(),tu:fields.tu.value.trim(),purpose:fields.purpose.value.trim(),characteristics:fields.characteristics.value.trim()},variants,positions:[...selected].map(id=>P.positionSnapshot(id,project.positions))};
    options.save(f,{id:uid('edit'),at:new Date().toISOString(),actor:fields.actor.value.trim()},project.id);
  }catch(err){options.notice(err.message);}});for(const e of form.querySelectorAll('input,textarea,select'))for(const event of ['input','change'])e.addEventListener(event,()=>options.dirty?.());box.append(form);
  const linked=n('section');linked.append(n('h3','Сохранённые позиции для проверки'));
  for(const p of project.positions){const line=n('p');line.append(document.createTextNode(p.codeText+' · '+p.title+' · применимость не подтверждена. '));const link=n('a','Открыть источник');link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';line.append(link);linked.append(line);}box.append(linked);
  if(saved){const history=n('details');history.id='project-identity-history';history.append(n('summary','История карточки · '+project.projectHistory.length));for(const h of [...project.projectHistory].reverse())history.append(n('p',h.at+' · '+h.actor+' · версия '+h.revision),n('p',h.snapshot.product.name+' · '+(h.snapshot.product.okpd2||'Код не задан')+' · исполнений '+h.snapshot.variants.length,'small'));box.append(history);}
}
root.NavigatorProjectUI={draft,render};
})(globalThis);
