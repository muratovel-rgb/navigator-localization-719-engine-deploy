(function(root){
'use strict';
const T=root.Tpp52Dossier;
const production={NOT_CHECKED:'Не проверено',PERFORMED:'Выполняется',PARTIAL:'Выполняется частично',NOT_PERFORMED:'Не выполняется'};
const documentary={NOT_CHECKED:'Не проверено',SUFFICIENT:'Достаточно по внутренней проверке',MISSING:'Документов нет',INSUFFICIENT:'Документы не подтверждают факт'};
const gapLabels={SOURCE_UNCHECKED:'Сверить источник и применимость',PERIOD_UNCONFIRMED:'Проверить период на дату оценки',RECHECK:'Повторить проверку после изменений',ORIGIN_UNCHECKED:'Проверить связанные объекты и исходную цепочку',ORIGIN_SCOPE_GAP:'Уточнить исполнения в цепочке происхождения',REQUEST_SCOPE_GAP:'Расширить связанный дозапрос на все исполнения требования',PRODUCTION_UNCHECKED:'Проверить фактическое производство',PRODUCTION_GAP:'Устранить производственный разрыв',EVIDENCE_UNCHECKED:'Проверить доказательства',EVIDENCE_GAP:'Дополнить доказательства'};
const actionKinds={VERIFY_SOURCE:'Проверить норму и применимость',VERIFY_PRODUCTION:'Проверить производство',CHANGE_PRODUCTION:'Изменить производство',REQUEST_EVIDENCE:'Запросить документы',REVIEW_EVIDENCE:'Проверить документы'};
const errors={'Requirement fields required':'Укажи требование, источник, пункт и исполнения','Invalid requirement source status':'Выбери статус проверки источника','Requirement source fields required':'Проверь сведения об источнике','Invalid requirement source URL':'Укажи ссылку, начинающуюся с https:// или http://','Invalid requirement source dates':'Проверь даты редакции и периода действия','Requirement source review required':'Для сверенного источника нужны редакция, дата сверки, начало действия и основание применимости','Unknown requirement origin':'Связанный объект происхождения не найден','Requirement review required':'Укажи фактическое состояние и основание вывода','Requirement evidence does not cover scope':'Для достаточности доказательств нужны документы по всем исполнениям строки','Requirement action required':'Укажи действие, ответственного и срок','Requirement request does not cover scope':'Выбранный запрос должен охватывать все исполнения требования'};
function render(o){
 const {box,a,state,send,node:n,field,choose,scopeField,evidencePicker,selected,referenceList,disclosure,action,submit,uid}=o;
 const items=state.requirements||[],summary=T.requirementSummary(state,a.date),body=n('div');
 const section=disclosure('Требования и разрывы · '+summary.needsWork+' требуют работы',body,'localization-matrix');
 box.append(section);
 body.append(n('p','Запиши применимое требование и проверь его по операциям и документам. Матрица заполняется вручную; полнота требований и соответствие №719 автоматически не определяются.','small'));
 const counter=n('p',items.length?'Внесено требований: '+summary.total+' · принято во внутренней проверке: '+summary.internallyAccepted:'Требований пока нет. Начни с применимой позиции и обязательных условий.');counter.id='requirement-summary';body.append(counter);
 const names=ids=>ids.map(id=>a.variants?.find(v=>v.id===id)?.label||id).join('; ');
 const form=()=>n('form',undefined,'tpp-form');
 const bind=(f,fn)=>action(f,()=>{try{return fn();}catch(e){throw Error(errors[e.message]||e.message);}});
 const select=(label,id,labels)=>choose(label,id,Object.entries(labels));
 const rf=form(),which=choose('Требование','requirement-select',[['new','Новое требование'],...items.map(r=>[r.id,r.condition.slice(0,100)])]),f={};rf.append(which.label);
 for(const [key,label,type]of [['condition','Что требуется','textarea'],['sourceReference','Документ-основание'],['clause','Пункт или позиция']]){f[key]=field(label,'requirement-'+key,type);rf.append(f[key].label);}
 const scope=scopeField('Исполнения требования','requirement-scope');rf.append(scope.label);
 const source=n('div'),status=select('Проверка источника','requirement-sourceStatus',{CANDIDATE:'Нужна сверка',SOURCE_CHECKED:'Источник и применимость сверены вручную'});source.append(status.label);
 for(const [key,label,type]of [['sourceUrl','Ссылка на источник'],['sourceEdition','Редакция'],['sourceCheckedOn','Дата сверки','date'],['effectiveFrom','Применяется с','date'],['effectiveTo','Применяется по, если известно','date'],['sourceBasis','Что сверено и почему требование применимо','textarea']]){f[key]=field(label,'requirement-'+key,type);source.append(f[key].label);}
 const originBox=n('fieldset');originBox.id='requirement-origins';originBox.append(n('legend','Связанные материалы и детали'));
 for(const x of state.origins||[]){const l=n('label',undefined,'check'),i=n('input');i.type='checkbox';i.value=x.id;l.append(i,document.createTextNode(x.label));originBox.append(l);}
 source.append(originBox);rf.append(disclosure('Источник, период и связанные объекты',source,'requirement-source'));submit(rf,'Сохранить требование');
 which.input.addEventListener('change',()=>{const r=items.find(r=>r.id===which.input.value);for(const [k,v]of Object.entries(f))v.input.value=r?.[k]||'';scope.assign(r?.scope||[]);status.input.value=r?.sourceStatus||'CANDIDATE';for(const i of originBox.querySelectorAll('input'))i.checked=!!r?.originIds.includes(i.value);});
 bind(rf,()=>{const d=new Date(),recordedLocalDate=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return send('requirement.record',{requirementId:which.input.value==='new'?uid('requirement'):which.input.value,...Object.fromEntries(Object.entries(f).map(([k,v])=>[k,v.input.value.trim()])),recordedLocalDate,scope:scope.values(),sourceStatus:status.input.value,originIds:selected(originBox)});});body.append(disclosure('Добавить или изменить требование',rf,'requirement-add'));
 for(const r of items){
  const row=summary.rows.find(x=>x.requirementId===r.id),content=n('div'),record=disclosure((row.internallyAccepted?'Внутренне проверено':'Требует работы')+' · '+r.condition.slice(0,100),content,'requirement-record-'+r.id);
  content.append(n('p',r.condition),n('p',r.sourceReference+' · '+r.clause+' · '+names(r.scope),'small'));
  const src=n('div');src.append(n('p',r.sourceStatus==='SOURCE_CHECKED'?'Источник и применимость сверены вручную':'Источник и применимость требуют сверки'),n('p','Редакция: '+(r.sourceEdition||'не указана')+' · сверка: '+(r.sourceCheckedOn||'не выполнена'),'small'),n('p','Период: '+(r.effectiveFrom||'не установлен')+' / '+(r.effectiveTo||'окончание не указано')+'. Дата оценки: '+a.date,'small'));
  if(r.sourceBasis)src.append(n('p',r.sourceBasis));if(r.sourceUrl){const link=n('a','Открыть источник');link.href=r.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';src.append(link);}content.append(disclosure('Основание требования',src));
  content.append(n('p','Производство: '+production[r.review?.production||'NOT_CHECKED']),n('p','Доказательства: '+documentary[r.review?.documentary||'NOT_CHECKED']));
  if(r.review){content.append(n('p',r.review.fact),n('p',[r.review.operation,r.review.site,r.review.performer].filter(Boolean).join(' · '),'small'),n('p',r.review.basis+' · '+r.review.actor+' · '+r.review.at,'small'));for(const e of r.review.evidence){const doc=state.documents.find(d=>d.id===e.documentId),ver=doc.versions.find(v=>v.id===e.versionId);content.append(n('p',ver.title+(doc.currentVersionId!==ver.id?' · заменённая версия':' · текущая версия'),'small'));}}
  for(const gap of row.gaps)content.append(n('p',gapLabels[gap],gap==='RECHECK'?'banner':'small'));
  const vf=form(),v={};
  const prod=select('Выполнение требования в производстве','requirement-production-'+r.id,production),proof=select('Достаточность доказательств','requirement-documentary-'+r.id,documentary);prod.input.value=r.review?.production||'NOT_CHECKED';proof.input.value=r.review?.documentary||'NOT_CHECKED';vf.append(prod.label,proof.label);
  for(const [key,label,type]of [['fact','Что установлено фактически','textarea'],['operation','Операция или проверяемое условие'],['site','Где выполняется'],['performer','Кто выполняет'],['basis','Что проверено и на чём основан вывод','textarea']]){v[key]=field(label,'requirement-'+key+'-'+r.id,type,r.review?.[key]||'');vf.append(v[key].label);}
  const ev=evidencePicker(state,'requirement-evidence-'+r.id);vf.append(ev);submit(vf,'Сохранить внутреннюю проверку');bind(vf,()=>send('requirement.review',{requirementId:r.id,production:prod.input.value,documentary:proof.input.value,...Object.fromEntries(Object.entries(v).map(([k,f])=>[k,f.input.value.trim()])),evidence:referenceList(state,selected(ev))}));content.append(disclosure('Проверить факт и доказательства',vf,'requirement-review-'+r.id));
  if(r.action)content.append(n('p','Действие: '+r.action.text),n('p',r.action.owner+' · срок '+r.action.dueDate,'small'));
  const af=form(),kind=select('Что сделать','requirement-action-kind-'+r.id,actionKinds),task=field('Действие или вариант устранения','requirement-action-text-'+r.id,'textarea',r.action?.text||''),owner=field('Ответственный','requirement-owner-'+r.id,'text',r.action?.owner||''),due=field('Срок','requirement-due-'+r.id,'date',r.action?.dueDate||''),request=choose('Связанный дозапрос','requirement-request-'+r.id,[['','Без связи'],...(state.requests||[]).filter(q=>r.scope.every(s=>q.scope.includes(s))).map(q=>[q.id,q.title])]);
  kind.input.value=r.action?.kind||'VERIFY_SOURCE';request.input.value=r.action?.requestId||'';af.append(kind.label,task.label,owner.label,due.label,request.label);submit(af,'Сохранить действие');bind(af,()=>send('requirement.action',{requirementId:r.id,kind:kind.input.value,text:task.input.value.trim(),owner:owner.input.value.trim(),dueDate:due.input.value,requestId:request.input.value}));content.append(disclosure('Назначить следующее действие',af));body.append(record);
 }
 if(items.length){
  const exportButton=n('button','Выгрузить матрицу');exportButton.type='button';exportButton.id='requirement-export';exportButton.addEventListener('click',()=>{
   const payload={format:'navigator-719-requirements-v1',projectId:a.id,evaluationDate:a.date,requirements:items,summary},url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),link=n('a');link.href=url;link.download='navigator-719-requirements.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });body.append(exportButton);
 }
}
root.NavigatorRequirementsUI={render};
})(globalThis);
