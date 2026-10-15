(function(root){
'use strict';
const T=root.Tpp52Dossier, statuses={OPEN:'Открыто',DOCUMENT_RECEIVED:'Документ получен, нужна проверка',RESOLVED:'Устранено по внутренней проверке',PARTIALLY_RESOLVED:'Устранено частично',REOPENED:'Нужна повторная проверка'};
let ctx,actor='';
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const uid=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const field=(label,id,type='text',value='')=>{const l=node('label',label),i=node(type==='textarea'?'textarea':'input');i.id=id;if(type!=='textarea')i.type=type;i.value=value;if(type!=='file')i.maxLength=5000;l.append(i);return {label:l,input:i};};
function choose(label,id,options){const l=node('label',label),s=node('select');s.id=id;for(const [value,text]of options){const o=node('option',text);o.value=value;s.append(o);}l.append(s);return {label:l,input:s};}
const scopes=value=>[...new Set(value.split(';').map(s=>s.trim()).filter(Boolean))];
function current(){const a=ctx.assessment();return a.tpp52||T.create(a.id);}
function dispatch(type,payload){
  if(!actor.trim())throw Error('Укажи, кто вносит запись или проверяет ответ');
  const next=T.apply(current(),{id:uid('event'),at:new Date().toISOString(),actor:actor.trim(),type,payload});
  if(!ctx.commit(next))throw Error('Не удалось сохранить. Предыдущие данные не заменены');
  render(ctx.assessment());ctx.notice('Запись сохранена в досье проекта');
}
const errors={'Invalid document':'Проверь название, исполнения и данные документа','Invalid remark content':'Заполни текст замечания и проверяемый вопрос','Invalid remark scope':'Укажи затронутые исполнения','Resolution requires evidence':'Для закрытия замечания выбери доказательства','Evidence does not cover all affected variants':'Документы не охватывают все исполнения замечания','Missing or superseded evidence':'Выбрана отсутствующая или заменённая версия документа','Document receipt requires evidence':'Выбери документ, полученный с ответом','Review result and basis required':'Укажи основание результата проверки','Answer required':'Укажи содержание полученного ответа','Reopen reason required':'Укажи причину повторной проверки','Official decision source required':'Укажи реквизиты и источник внешнего решения','Official decision needs document version reference':'Свяжи решение с версией документа'};
function action(form,fn){form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type="submit"]');if(b)b.disabled=true;try{await fn();}catch(err){ctx.notice(errors[err.message]||err.message);}finally{if(b)b.disabled=false;}});}
function submit(form,label){const b=node('button',label);b.type='submit';form.append(b);return b;}
function referenceList(state,selection){
  return state.documents.filter(d=>selection.includes(d.id)).map(d=>({documentId:d.id,versionId:d.currentVersionId}));
}
function evidencePicker(state,id){
  const box=node('fieldset'),legend=node('legend','Документы для этого ответа или проверки');box.id=id;box.append(legend);
  for(const d of state.documents){const v=d.versions.find(v=>v.id===d.currentVersionId),l=node('label',undefined,'check'),i=node('input');i.type='checkbox';i.value=d.id;l.append(i,document.createTextNode(v.title+' · '+v.scope.join('; ')));box.append(l);}
  if(!state.documents.length)box.append(node('p','Сначала добавь документ.','small'));
  return box;
}
function selected(box){return [...box.querySelectorAll('input')].filter(i=>i.checked).map(i=>i.value);}
function render(a){
  const box=document.getElementById('tpp52-content');if(!box)return;box.replaceChildren();
  const state=a.tpp52||T.create(a.id),ready=T.readiness(state);
  box.append(node('p','Документы хранятся у тебя. В досье записываются их название, контрольная сумма, исполнения и история проверки. Файлы никуда не отправляются.','small'));
  box.append(node('p','Проверки по редакции №52 от 29.07.2026 ещё не активированы. Этот раздел ведёт досье и замечания; соответствие нормам и решение ТПП он автоматически не подтверждает.','banner'));
  const send=(type,payload)=>{if(ctx.assessment()?.id!==a.id||JSON.stringify(current())!==JSON.stringify(state))throw Error('Проект изменился. Повтори действие в текущем досье');dispatch(type,payload);};
  const who=field('Кто вносит запись или проверяет ответ','tpp52-actor','text',actor);who.input.maxLength=200;who.input.addEventListener('input',()=>{actor=who.input.value;});box.append(who.label);
  box.append(node('p',state.documents.length+' документов · '+state.remarks.length+' замечаний · '+ready.unresolvedRemarkIds.length+' требуют работы','tpp-summary'));
  const docs=node('section');docs.append(node('h3','Документы и версии'));
  const form=node('form',undefined,'tpp-form');
  const doc=choose('Документ','tpp-doc-select',[['new','Новый документ'],...state.documents.map(d=>[d.id,d.versions.find(v=>v.id===d.currentVersionId).title])]);
  const title=field('Название или обозначение документа','tpp-doc-title');title.input.maxLength=500;
  const scope=field('Исполнения через точку с запятой','tpp-doc-scope');scope.input.placeholder='Например: GCV DN20; GCV DN32';
  const file=field('Файл для фиксации версии','tpp-doc-file','file');
  const reference=field('Реквизиты или место хранения','tpp-doc-reference','textarea');
  form.append(doc.label,title.label,scope.label,file.label,reference.label);submit(form,'Сохранить версию документа');
  doc.input.addEventListener('change',()=>{const d=state.documents.find(d=>d.id===doc.input.value);if(d){const v=d.versions.find(v=>v.id===d.currentVersionId);title.input.value=v.title;scope.input.value=v.scope.join('; ');reference.input.value=v.reference||'';}});
  action(form,async()=>{
    const f=file.input.files?.[0];if(!f)throw Error('Выбери файл документа');
    if(!root.crypto?.subtle)throw Error('Браузер не поддерживает контрольную сумму файла. Открой HTML в актуальном браузере');
    if(f.size>50*1024*1024)throw Error('Для фиксации версии выбери файл до 50 МБ');
    if(!title.input.value.trim()||!scopes(scope.input.value).length)throw Error('Укажи название документа и исполнения');
    const bytes=await f.arrayBuffer(),digest=await root.crypto.subtle.digest('SHA-256',bytes),checksum=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
    send('document.version',{documentId:doc.input.value==='new'?uid('doc'):doc.input.value,versionId:uid('version'),title:title.input.value.trim(),scope:scopes(scope.input.value),checksum,reference:reference.input.value.trim()});
  });docs.append(form);
  for(const d of state.documents){
    const article=node('details',undefined,'tpp-record'),v=d.versions.find(v=>v.id===d.currentVersionId);article.append(node('summary',v.title+' · версий: '+d.versions.length));
    for(const ver of [...d.versions].reverse())article.append(node('p',ver.title+(ver.id===d.currentVersionId?' · текущая версия':' · предыдущая версия')),node('p','Исполнения: '+ver.scope.join('; '),'small'),node('p',ver.recordedAt+' · '+ver.recordedBy,'small'),node('p',ver.reference||'Место хранения не указано','small'),node('p','SHA-256: '+ver.checksum,'tpp-hash'));
    docs.append(article);
  }
  box.append(docs);
  const remarks=node('section');remarks.append(node('h3','Замечания и дозапросы'));
  const rf=node('form',undefined,'tpp-form');
  const source=choose('Источник замечания','tpp-remark-source',[['TPP','ТПП'],['INTERNAL','Внутренняя проверка'],['MINPROMTORG','Минпромторг']]);
  const check=choose('Проверяемый вопрос','tpp-remark-check',(root.Tpp52Checks?.checks||[]).map(c=>[c.id,c.id+' · '+c.clause+' · '+c.condition]));
  const text=field('Текст замечания','tpp-remark-text','textarea'),rs=field('Затронутые исполнения через точку с запятой','tpp-remark-scope');
  const related=evidencePicker(state,'tpp-remark-docs');rf.append(source.label,check.label,text.label,rs.label,related);submit(rf,'Добавить замечание');
  action(rf,()=>send('remark.open',{remarkId:uid('remark'),source:source.input.value,checkId:check.input.value,text:text.input.value.trim(),scope:scopes(rs.input.value),documentIds:selected(related)}));remarks.append(rf);
  for(const r of [...state.remarks].reverse()){
    const record=node('details',undefined,'tpp-record');record.open=r.status!=='RESOLVED';record.append(node('summary',statuses[r.status]+' · '+r.text.slice(0,100)),node('p',r.text),node('p',r.checkId+' · '+({TPP:'ТПП',INTERNAL:'Внутренняя проверка',MINPROMTORG:'Минпромторг'}[r.source])+' · '+r.scope.join('; '),'small'));
    if(r.recheckReason)record.append(node('p',r.recheckReason==='Document version changed'?'Документ заменён. Проверь связанные выводы ещё раз.':r.recheckReason,'banner'));
    if(r.lastReview)record.append(node('p','Последняя внутренняя проверка: '+r.lastReview.at+' · '+r.lastReview.reviewer+' · '+r.lastReview.basis,'small'));
    if(r.officialDecisions.length)for(const dec of r.officialDecisions)record.append(node('p','Записанное внешнее решение: '+(dec.decision==='ACCEPTED'?'принято':'не принято')+' · '+dec.reference+' · '+dec.at,'small'));
    const answerForm=node('form',undefined,'tpp-form'),answer=field('Ответ или основание проверки','answer-'+r.id,'textarea'),evidence=evidencePicker(state,'evidence-'+r.id),mode=choose('Действие','mode-'+r.id,[['receive','Зафиксировать получение ответа'],['RESOLVED','Устранено по внутренней проверке'],['PARTIALLY_RESOLVED','Устранено частично'],['OPEN','Оставить открытым'],['reopen','Вернуть на проверку']]);
    answerForm.append(answer.label,evidence,mode.label);submit(answerForm,'Сохранить результат');
    action(answerForm,()=>{
      const refs=referenceList(current(),selected(evidence));
      if(mode.input.value==='receive')send('remark.receive',{remarkId:r.id,answer:answer.input.value.trim(),evidence:refs});
      else if(mode.input.value==='reopen')send('remark.reopen',{remarkId:r.id,reason:answer.input.value.trim()});
      else send('remark.review',{remarkId:r.id,result:mode.input.value,basis:answer.input.value.trim(),evidence:refs});
    });record.append(answerForm);
    const official=node('details');official.append(node('summary','Зафиксировать полученное решение ТПП или Минпромторга'));
    const of=node('form',undefined,'tpp-form'),decision=choose('Результат','decision-'+r.id,[['ACCEPTED','Принято'],['NOT_ACCEPTED','Не принято']]),basis=field('Реквизиты решения и источник','official-'+r.id,'textarea'),orefs=evidencePicker(state,'official-evidence-'+r.id);of.append(decision.label,basis.label,orefs);submit(of,'Записать внешнее решение');
    action(of,()=>send('remark.official_decision',{remarkId:r.id,decision:decision.input.value,reference:basis.input.value.trim(),evidence:referenceList(current(),selected(orefs))}));official.append(of);record.append(official);remarks.append(record);
  }
  box.append(remarks);
  const history=node('details');history.append(node('summary','История изменений · '+state.events.length));
  for(const e of [...state.events].reverse()){
    const types={'document.version':'Версия документа','remark.open':'Открыто замечание','remark.receive':'Получен ответ','remark.review':'Проведена проверка','remark.reopen':'Повторная проверка','remark.official_decision':'Записано внешнее решение'};
    history.append(node('p',e.at+' · '+e.actor+' · '+types[e.type]),node('p',e.payload.title||e.payload.text||e.payload.answer||e.payload.basis||e.payload.reason||e.payload.reference||'','small'));
  }box.append(history);
}
root.Tpp52UI={init:config=>{ctx=config;},render};
})(globalThis);
