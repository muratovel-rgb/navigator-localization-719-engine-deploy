(function(root) {
'use strict';
const clone = x => JSON.parse(JSON.stringify(x));
const canonical = x => Array.isArray(x) ? '['+x.map(canonical).join(',')+']' : x && typeof x === 'object' ? '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}' : JSON.stringify(x);
const demand = (ok, msg) => { if (!ok) throw new Error(msg); };
function unique(list, label) {
  demand(new Set(list.map(x=>x.id)).size===list.length, 'Повторяется ID: '+label);
}
function validStore(value, validate) {
  try {
    if (!validate(value)) return false;
    unique(value.assessments,'проекты'); unique(value.history,'история');
    const archive=value.importArchive || [];
    if (!Array.isArray(archive) || archive.length>100) return false;
    unique(archive,'архив');
    if (!archive.every(x=>x && typeof x.id==='string' && typeof x.importedAt==='string' && !Number.isNaN(Date.parse(x.importedAt)) && x.assessment && validate({formatVersion:2,assessments:[x.assessment],history:[]}))) return false;
    return value.legacyImports===undefined || Array.isArray(value.legacyImports);
  } catch {return false;}
}
function unionById(local, incoming, label) {
  const out=clone(local), byId=new Map(out.map(x=>[x.id,x]));
  for(const item of incoming) {
    if(byId.has(item.id)) demand(canonical(byId.get(item.id))===canonical(item),'Конфликт неизменяемой записи: '+label+' '+item.id);
    else {const copy=clone(item);out.push(copy);byId.set(copy.id,copy);}
  }
  return out;
}
function prepare(current, incoming, validate) {
  demand(validStore(current,validate) && validStore(incoming,validate),'Данные проекта или история не прошли проверку');
  const supported=['formatVersion','assessments','history','legacyImports','importArchive'];
  const extras=Object.keys(incoming).filter(k=>!supported.includes(k));
  demand(!extras.length,'В файле есть новые поля. Импорт остановлен, чтобы их не потерять: '+extras.join(', '));
  // Immutable history conflicts fail before any local storage operation.
  unionById(current.history,incoming.history,'расчёт');
  unionById(current.importArchive||[],incoming.importArchive||[],'архив');
  const map=new Map(current.assessments.map(a=>[a.id,a]));
  const conflicts=incoming.assessments.filter(a=>map.has(a.id) && canonical(a)!==canonical(map.get(a.id))).map(a=>({id:a.id,local:clone(map.get(a.id)),incoming:clone(a)}));
  return {baseline:canonical(current), incoming:clone(incoming), conflicts, newAssessmentIds:incoming.assessments.filter(a=>!map.has(a.id)).map(a=>a.id)};
}
function apply(current, plan, choices, at, validate) {
  demand(canonical(current)===plan.baseline,'Проекты изменились после просмотра импорта. Открой файл ещё раз');
  demand(typeof at==='string' && !Number.isNaN(Date.parse(at)),'Некорректная дата импорта');
  const fresh=prepare(current,plan.incoming,validate);
  demand(fresh.conflicts.every(c=>['local','incoming'].includes(choices?.[c.id])),'Выбери версию каждого изменённого проекта');
  const next=clone(current), incoming=fresh.incoming;
  next.history=unionById(current.history,incoming.history,'расчёт');
  next.importArchive=unionById(current.importArchive||[],incoming.importArchive||[],'архив');
  const byId=new Map(next.assessments.map((a,i)=>[a.id,i]));let added=0,updated=0,kept=0;
  for(const a of incoming.assessments) {
    if(!byId.has(a.id)){byId.set(a.id,next.assessments.length);next.assessments.push(clone(a));added++;continue;}
    const i=byId.get(a.id), old=next.assessments[i];
    if(canonical(old)===canonical(a))continue;
    // Preserve the unselected version whichever option the user chooses.
    const keepIncoming=choices[a.id]==='incoming';
    const displaced=keepIncoming?old:a;
    const already=next.importArchive.some(x=>canonical(x.assessment)===canonical(displaced));
    if(!already)next.importArchive.push({id:'import-'+at+'-'+next.importArchive.length,importedAt:at,assessment:clone(displaced)});
    if(keepIncoming){next.assessments[i]=clone(a);updated++;}else kept++;
  }
  next.legacyImports=clone(current.legacyImports||[]);
  for(const legacy of incoming.legacyImports||[])if(!next.legacyImports.some(x=>canonical(x)===canonical(legacy)))next.legacyImports.push(clone(legacy));
  demand(validStore(next,validate),'Результат импорта превышает лимиты или не прошёл проверку. Текущие данные сохранены');
  return {data:next,added,updated,kept,archived:next.importArchive.length-(current.importArchive?.length||0)};
}
const api={prepare,apply,validStore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NavigatorProjectImport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
