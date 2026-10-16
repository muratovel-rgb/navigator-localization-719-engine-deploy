(function(root) {
'use strict';

// Project workflow only. No route, statutory obligation, deadline or calculation
// is inferred here. Normative activation requires a separately reviewed package.
const SCHEMA = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
const text = (v, max = 5000) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const id = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(v);
const list = v => Array.isArray(v) && v.length <= 100 && v.every(id) && new Set(v).size === v.length;
const scopes = v => Array.isArray(v) && v.length > 0 && v.length <= 100 && v.every(x => text(x, 120)) && new Set(v).size === v.length;
const date = v => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
function demand(ok, reason) { if (!ok) throw new Error(reason); }
function create(assessmentId) {
  demand(id(assessmentId), 'Invalid assessment id');
  return {schemaVersion: SCHEMA, assessmentId, documents: [], remarks: [], events: []};
}
function evidenceRefs(state, refs, currentOnly) {
  demand(Array.isArray(refs) && refs.length <= 100, 'Invalid evidence list');
  const seen = new Set();
  return refs.map(ref => {
    demand(ref && id(ref.documentId) && id(ref.versionId), 'Invalid evidence reference');
    const key = ref.documentId + '/' + ref.versionId;
    demand(!seen.has(key), 'Duplicate evidence'); seen.add(key);
    const doc = state.documents.find(d => d.id === ref.documentId);
    const version = doc?.versions.find(v => v.id === ref.versionId);
    demand(version && (!currentOnly || doc.currentVersionId === version.id), 'Missing or superseded evidence');
    return {documentId: doc.id, versionId: version.id};
  });
}
function covered(state, refs, scope) {
  const all=new Set(refs.flatMap(ref=>state.documents.find(d=>d.id===ref.documentId).versions.find(v=>v.id===ref.versionId).scope));
  return scope.every(s=>all.has(s));
}
function recordingDate(event,p){
  const day=p.recordedLocalDate||event.at.slice(0,10),utc=Date.parse(event.at);
  demand(date(day)&&day>=new Date(utc-12*3600000).toISOString().slice(0,10)&&day<=new Date(utc+14*3600000).toISOString().slice(0,10),'Invalid recording date');
  return day;
}
function invalidateWorkflow(next, reason, documentId) {
  invalidateRequirements(next,reason,documentId);
  for(const r of next.requests||[])if(!documentId||r.evidence.some(e=>e.documentId===documentId)||r.review?.evidence.some(e=>e.documentId===documentId)) {r.status='REOPENED';r.recheckReason=reason;}
  const changed=new Set((next.origins||[]).filter(o=>!documentId||o.evidence.some(e=>e.documentId===documentId)||o.review?.evidence.some(e=>e.documentId===documentId)).map(o=>o.id));
  let repeat=true;while(repeat){repeat=false;for(const o of next.origins||[])if(!changed.has(o.id)&&o.parentIds.some(id=>changed.has(id))){changed.add(o.id);repeat=true;}}
  for(const o of next.origins||[])if(changed.has(o.id)){o.status='LEGAL_REVIEW_REQUIRED';o.recheckReason=reason;}
}
function invalidateRequirements(next,reason,documentId,originIds) {
  for(const r of next.requirements||[])if((!documentId&&!originIds)||
    (documentId&&r.review?.evidence.some(e=>e.documentId===documentId))||
    (originIds&&r.originIds.some(id=>originIds.has(id))))r.recheckReason=reason;
}
function reduce(state, event) {
  demand(event && id(event.id) && text(event.actor, 200), 'Invalid event identity');
  demand(typeof event.at === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(event.at) && new Date(event.at).toISOString() === event.at, 'Invalid event time');
  demand(!state.events.length || event.at >= state.events.at(-1).at, 'Event time precedes prior event');
  demand(event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload), 'Invalid event payload');
  const next = clone(state), p = event.payload;
  const remark = () => { const r = next.remarks.find(r => r.id === p.remarkId); demand(r, 'Remark not found'); return r; };
  switch (event.type) {
    case 'document.version': {
      demand(id(p.documentId) && id(p.versionId) && text(p.title, 500) && scopes(p.scope), 'Invalid document');
      demand(p.reference === undefined || (typeof p.reference === 'string' && p.reference.length <= 5000), 'Invalid document reference');
      demand(typeof p.checksum === 'string' && /^[a-f0-9]{64}$/.test(p.checksum), 'SHA-256 required');
      let doc = next.documents.find(d => d.id === p.documentId);
      if (!doc) { demand(next.documents.length < 200, 'Document limit'); doc = {id: p.documentId, currentVersionId: '', versions: []}; next.documents.push(doc); }
      demand(!doc.versions.some(v => v.id === p.versionId), 'Document version already exists');
      const oldVersion = doc.currentVersionId;
      doc.versions.push({id: p.versionId, title: p.title, checksum: p.checksum, scope: clone(p.scope), recordedAt: event.at, recordedBy: event.actor});
      if (p.reference !== undefined) doc.versions.at(-1).reference = p.reference;
      for(const key of ['fileName','mimeType'])if(p[key]!==undefined){
        demand(typeof p[key]==='string'&&p[key].length<=500,'Invalid file metadata');
        doc.versions.at(-1)[key]=p[key];
      }
      doc.currentVersionId = p.versionId;
      if (oldVersion) for (const r of next.remarks) {
        if (r.documentIds.includes(doc.id) || r.evidence.some(e => e.documentId === doc.id) || r.officialDecisions.some(d => d.evidence.some(e => e.documentId === doc.id))) {
          r.status = 'REOPENED'; r.recheckReason = 'Document version changed';
          r.recheckEventId = event.id;
          // A prior official decision remains a historical fact, not approval
          // of the replacement document.
        }
      }
      if(oldVersion)invalidateWorkflow(next,'Document version changed',doc.id);
      break;
    }
    case 'document.format_review': {
      const doc=next.documents.find(d=>d.id===p.documentId);
      demand(doc&&doc.currentVersionId===p.versionId,'Missing or superseded evidence');
      demand(['EDITABLE','READ_ONLY','UNDETERMINED'].includes(p.result)&&text(p.basis),'Document format review required');
      const version=doc.versions.find(v=>v.id===p.versionId);
      version.formatReview={eventId:event.id,at:event.at,actor:event.actor,result:p.result,basis:p.basis};
      if(p.result!=='EDITABLE')for(const request of next.requests||[]){
        if(request.formatRequirement==='EDITABLE'&&request.status==='REVIEWED'&&request.review?.evidence.some(r=>r.documentId===doc.id)){
          request.status='REOPENED';request.recheckReason='Document format review changed';
        }
      }
      break;
    }
    case 'remark.open': {
      demand(id(p.remarkId) && !next.remarks.some(r => r.id === p.remarkId) && next.remarks.length < 200, 'Invalid or duplicate remark');
      demand(['TPP','INTERNAL','MINPROMTORG'].includes(p.source) && text(p.text) && /^P(0[1-9]|[1-4][0-9]|5[0-4])$/.test(p.checkId), 'Invalid remark content');
      demand(scopes(p.scope) && list(p.documentIds), 'Invalid remark scope');
      demand(p.documentIds.every(k => next.documents.some(d => d.id === k)), 'Unknown related document');
      next.remarks.push({id: p.remarkId, source: p.source, text: p.text, checkId: p.checkId, scope: clone(p.scope), documentIds: clone(p.documentIds), status: 'OPEN', evidence: [], lastReview: null, officialDecisions: [], openedAt: event.at});
      break;
    }
    case 'remark.receive': {
      const r = remark(); demand(text(p.answer), 'Answer required');
      r.evidence = evidenceRefs(next, p.evidence, true);
      demand(r.evidence.length > 0, 'Document receipt requires evidence');
      r.status = 'DOCUMENT_RECEIVED'; r.answer = p.answer;
      break;
    }
    case 'remark.review': {
      const r = remark();
      demand(['RESOLVED','PARTIALLY_RESOLVED','OPEN'].includes(p.result) && text(p.basis), 'Review result and basis required');
      const refs = evidenceRefs(next, p.evidence, true);
      if (p.result === 'RESOLVED') {
        demand(refs.length > 0, 'Resolution requires evidence');
        const covered = new Set(refs.flatMap(ref => next.documents.find(d => d.id === ref.documentId).versions.find(v => v.id === ref.versionId).scope));
        demand(r.scope.every(x => covered.has(x)), 'Evidence does not cover all affected variants');
      }
      r.status = p.result; r.evidence = refs;
      r.lastReview = {eventId: event.id, reviewer: event.actor, at: event.at, result: p.result, basis: p.basis, evidence: clone(refs)};
      r.recheckReason = ''; r.recheckEventId = null;
      break;
    }
    case 'remark.reopen': {
      const r = remark(); demand(text(p.reason), 'Reopen reason required');
      r.status = 'REOPENED'; r.recheckReason = p.reason; r.recheckEventId = event.id;
      break;
    }
    case 'remark.official_decision': {
      const r = remark();
      demand(['ACCEPTED','NOT_ACCEPTED'].includes(p.decision) && text(p.reference), 'Official decision source required');
      const refs = evidenceRefs(next, p.evidence, true);
      demand(refs.length > 0, 'Official decision needs document version reference');
      r.officialDecisions.push({eventId: event.id, decision: p.decision, reference: p.reference, evidence: refs, at: event.at, recordedBy: event.actor});
      // Recording an external decision does not fabricate an internal review.
      break;
    }
    case 'request.open': {
      next.requests ||= [];
      demand(id(p.requestId)&&!next.requests.some(r=>r.id===p.requestId)&&next.requests.length<200,'Invalid request');
      demand(['title','reason','object','recipientRole','recipient','owner'].every(k=>text(p[k]))&&date(p.dueDate)&&scopes(p.scope),'Request fields required');
      demand(p.remarkId===''||next.remarks.some(r=>r.id===p.remarkId),'Unknown request remark');
      next.requests.push({id:p.requestId,title:p.title,reason:p.reason,object:p.object,recipientRole:p.recipientRole,recipient:p.recipient,owner:p.owner,dueDate:p.dueDate,scope:clone(p.scope),remarkId:p.remarkId,status:'OPEN',answer:'',evidence:[],review:null,recheckReason:'',openedAt:event.at});
      if(p.formatRequirement!==undefined){demand(['ANY','EDITABLE'].includes(p.formatRequirement),'Invalid requested format');next.requests.at(-1).formatRequirement=p.formatRequirement;}
      break;
    }
    case 'request.receive': {
      const r=next.requests?.find(r=>r.id===p.requestId);demand(r&&text(p.answer),'Request answer required');
      r.answer=p.answer;r.evidence=evidenceRefs(next,p.evidence,true);r.status='ANSWER_RECEIVED';break;
    }
    case 'request.review': {
      const r=next.requests?.find(r=>r.id===p.requestId);demand(r&&text(r.answer)&&text(p.basis)&&['ACCEPTED','PARTIAL','REJECTED'].includes(p.result),'Request review required');
      const refs=evidenceRefs(next,p.evidence,true);
      demand(p.result!=='ACCEPTED'||(refs.length>0&&covered(next,refs,r.scope)),'Request evidence does not cover scope');
      if(p.result==='ACCEPTED'&&r.formatRequirement==='EDITABLE'){
        const editable=refs.filter(ref=>next.documents.find(d=>d.id===ref.documentId).versions.find(v=>v.id===ref.versionId).formatReview?.result==='EDITABLE');
        demand(covered(next,editable,r.scope),'Editable evidence not reviewed for all variants');
      }
      r.evidence=refs;r.review={at:event.at,actor:event.actor,basis:p.basis,result:p.result,evidence:clone(refs)};
      r.status=p.result==='ACCEPTED'?'REVIEWED':p.result;r.recheckReason='';break;
    }
    case 'request.amend': {
      const r=next.requests?.find(r=>r.id===p.requestId);demand(r&&text(p.owner)&&date(p.dueDate)&&text(p.reason),'Request amendment required');
      r.owner=p.owner;r.dueDate=p.dueDate;break;
    }
    case 'origin.record': {
      next.origins ||= [];
      demand(id(p.nodeId)&&['RAW_MATERIAL','BLANK','PART','ASSEMBLY','PRODUCT'].includes(p.kind)&&text(p.label,500)&&scopes(p.scope),'Invalid origin object');
      demand(['designation','code','supplier','manufacturer','batch','delivery','operations','operationDates'].every(k=>typeof p[k]==='string'&&p[k].length<=5000),'Origin fields required');
      demand(list(p.parentIds)&&p.parentIds.every(id=>id!==p.nodeId&&next.origins.some(o=>o.id===id)),'Unknown origin parent');
      const descendants=new Set([p.nodeId]);let repeat=true;while(repeat){repeat=false;for(const o of next.origins)if(!descendants.has(o.id)&&o.parentIds.some(id=>descendants.has(id))){descendants.add(o.id);repeat=true;}}
      demand(!p.parentIds.some(id=>descendants.has(id)),'Origin chain cycle');
      const refs=evidenceRefs(next,p.evidence,true),old=next.origins.find(o=>o.id===p.nodeId);
      demand(old||next.origins.length<300,'Origin object limit');
      for(const o of next.origins)if(descendants.has(o.id)){o.status='LEGAL_REVIEW_REQUIRED';o.recheckReason='Origin object changed';}
      invalidateRequirements(next,'Origin object changed',null,descendants);
      const record={id:p.nodeId,kind:p.kind,label:p.label,scope:clone(p.scope),parentIds:clone(p.parentIds),evidence:refs,status:'COMPONENT_ORIGIN_UNCONFIRMED',review:old?.review||null,recheckReason:old?'Origin object changed':'',recordedAt:event.at};
      for(const k of ['designation','code','supplier','manufacturer','batch','delivery','operations','operationDates'])record[k]=p[k];
      if(old)Object.assign(old,record);else next.origins.push(record);break;
    }
    case 'origin.review': {
      const o=next.origins?.find(o=>o.id===p.nodeId);
      demand(o&&['RUS_CONFIRMED','RUS_RAW_MATERIAL_ONLY','COMPONENT_ORIGIN_UNCONFIRMED','FOREIGN','LEGAL_REVIEW_REQUIRED'].includes(p.status)&&text(p.basis),'Origin review required');
      const refs=evidenceRefs(next,p.evidence,true);
      demand(['classificationBasis','objectBasis','traceBasis'].every(k=>p[k]===undefined||(typeof p[k]==='string'&&p[k].length<=5000)),'Invalid origin basis');
      if(['RUS_CONFIRMED','RUS_RAW_MATERIAL_ONLY','FOREIGN'].includes(p.status))demand(refs.length>0&&covered(next,refs,o.scope),'Origin evidence does not cover scope');
      if(p.status==='RUS_CONFIRMED'){
        demand(text(p.classificationBasis)&&text(p.objectBasis)&&text(p.traceBasis)&&text(o.batch),'Object origin basis required');
        // This records a human conclusion for this object. It must not impose
        // a made-up statutory ban on foreign or unresolved input materials.
        // Chain completeness is displayed independently from object origin.
      }
      o.status=p.status;o.evidence=refs;o.review={at:event.at,actor:event.actor,status:p.status,basis:p.basis,classificationBasis:p.classificationBasis||'',objectBasis:p.objectBasis||'',traceBasis:p.traceBasis||'',evidence:clone(refs)};o.recheckReason='';
      // A parent's review never approves its descendants. Recheck old conclusions.
      const affected=new Set([o.id]);let repeat=true;while(repeat){repeat=false;for(const child of next.origins)if(!affected.has(child.id)&&child.parentIds.some(id=>affected.has(id))){affected.add(child.id);child.status='LEGAL_REVIEW_REQUIRED';child.recheckReason='Parent origin review changed';repeat=true;}}
      invalidateRequirements(next,'Origin review changed',null,affected);
      break;
    }
    case 'requirement.record': {
      next.requirements ||= [];
      const old=next.requirements.find(r=>r.id===p.requirementId);
      demand(id(p.requirementId)&&(old||next.requirements.length<200)&&text(p.condition)&&text(p.sourceReference)&&text(p.clause)&&scopes(p.scope),'Requirement fields required');
      demand(['CANDIDATE','SOURCE_CHECKED'].includes(p.sourceStatus),'Invalid requirement source status');
      demand(['sourceUrl','sourceEdition','sourceCheckedOn','effectiveFrom','effectiveTo','sourceBasis'].every(k=>typeof p[k]==='string'&&p[k].length<=5000),'Requirement source fields required');
      demand(!p.sourceUrl||/^https?:\/\/[^\s]+$/.test(p.sourceUrl),'Invalid requirement source URL');
      demand(['sourceCheckedOn','effectiveFrom','effectiveTo'].every(k=>!p[k]||date(p[k]))&&(!p.effectiveTo||!p.effectiveFrom||p.effectiveTo>=p.effectiveFrom),'Invalid requirement source dates');
      if(p.sourceStatus==='SOURCE_CHECKED')demand(text(p.sourceEdition)&&date(p.sourceCheckedOn)&&date(p.effectiveFrom)&&text(p.sourceBasis)&&p.sourceCheckedOn<=recordingDate(event,p),'Requirement source review required');
      demand(list(p.originIds)&&p.originIds.every(id=>next.origins?.some(o=>o.id===id)),'Unknown requirement origin');
      const record={id:p.requirementId,condition:p.condition,scope:clone(p.scope),originIds:clone(p.originIds),sourceStatus:p.sourceStatus,review:old?.review||null,action:old?.action||null,recheckReason:old?'Requirement or source changed':'',recordedAt:event.at,recordedBy:event.actor};
      for(const k of ['sourceReference','clause','sourceUrl','sourceEdition','sourceCheckedOn','effectiveFrom','effectiveTo','sourceBasis'])record[k]=p[k];
      if(old)Object.assign(old,record);else next.requirements.push(record);break;
    }
    case 'requirement.review': {
      const r=next.requirements?.find(r=>r.id===p.requirementId);
      demand(r&&['NOT_CHECKED','PERFORMED','PARTIAL','NOT_PERFORMED'].includes(p.production)&&['NOT_CHECKED','SUFFICIENT','MISSING','INSUFFICIENT'].includes(p.documentary)&&text(p.fact)&&text(p.basis),'Requirement review required');
      demand(['operation','site','performer'].every(k=>typeof p[k]==='string'&&p[k].length<=5000),'Requirement fact fields required');
      const refs=evidenceRefs(next,p.evidence,true);
      if(p.documentary==='SUFFICIENT')demand(refs.length>0&&covered(next,refs,r.scope),'Requirement evidence does not cover scope');
      r.review={at:event.at,actor:event.actor,production:p.production,documentary:p.documentary,fact:p.fact,basis:p.basis,operation:p.operation,site:p.site,performer:p.performer,evidence:refs};r.recheckReason='';break;
    }
    case 'requirement.action': {
      const r=next.requirements?.find(r=>r.id===p.requirementId);
      demand(r&&['VERIFY_SOURCE','VERIFY_PRODUCTION','CHANGE_PRODUCTION','REQUEST_EVIDENCE','REVIEW_EVIDENCE'].includes(p.kind)&&text(p.text)&&text(p.owner)&&date(p.dueDate),'Requirement action required');
      demand(p.requestId===''||next.requests?.some(q=>q.id===p.requestId&&r.scope.every(s=>q.scope.includes(s))),'Requirement request does not cover scope');
      r.action={at:event.at,actor:event.actor,kind:p.kind,text:p.text,owner:p.owner,dueDate:p.dueDate,requestId:p.requestId};break;
    }
    case 'workflow.recheck': {
      demand(text(p.reason),'Workflow recheck reason required');invalidateWorkflow(next,p.reason);break;
    }
    case 'package.freeze': {
      next.packages ||= [];
      demand(id(p.packageId)&&!next.packages.some(k=>k.id===p.packageId)&&next.packages.length<100&&text(p.title,500)&&scopes(p.scope),'Invalid package');
      demand(Number.isInteger(p.projectRevision)&&p.projectRevision>=0&&p.projectSnapshot&&typeof p.projectSnapshot==='object'&&!Array.isArray(p.projectSnapshot),'Project snapshot required');
      const refs=evidenceRefs(next,p.evidence,true);demand(refs.length>0&&covered(next,refs,p.scope),'Package evidence does not cover scope');
      next.packages.push({id:p.packageId,title:p.title,scope:clone(p.scope),frozenAt:event.at,frozenOn:recordingDate(event,p),frozenBy:event.actor,projectRevision:p.projectRevision,projectSnapshot:clone(p.projectSnapshot),documents:refs.map(ref=>({documentId:ref.documentId,...clone(next.documents.find(d=>d.id===ref.documentId).versions.find(v=>v.id===ref.versionId))})),remarks:clone(next.remarks),requests:clone(next.requests||[]),origins:clone(next.origins||[]),legalReadiness:'NOT_EVALUATED'});
      if(next.requirements)next.packages.at(-1).requirements=clone(next.requirements);
      break;
    }
    case 'official.event': {
      next.officialEvents ||= [];
      const pack=next.packages?.find(k=>k.id===p.packageId);
      demand(id(p.officialId)&&!next.officialEvents.some(e=>e.id===p.officialId)&&next.officialEvents.length<500&&pack,'Invalid official event');
      demand(['APPLICATION_CREATED','SIGNED','SUBMITTED','RETURNED','TPP_ACT','REGISTRY_ENTRY','REJECTED'].includes(p.kind)&&['GISP','TPP','MINPROMTORG'].includes(p.authority)&&text(p.number)&&text(p.reference)&&date(p.date)&&scopes(p.scope)&&p.scope.every(s=>pack.scope.includes(s)),'Official event fields required');
      demand(p.date<=recordingDate(event,p),'Official event date in future');
      demand((p.kind!=='TPP_ACT'||p.authority==='TPP')&&(p.kind!=='REGISTRY_ENTRY'||p.authority==='MINPROMTORG'),'Official authority mismatch');
      const refs=evidenceRefs(next,p.evidence,true);demand(refs.length>0&&covered(next,refs,p.scope),'Official evidence required');
      if(p.kind==='REGISTRY_ENTRY')demand(next.officialEvents.some(e=>e.kind==='SUBMITTED'&&e.packageId===pack.id&&e.date<=p.date&&p.scope.every(s=>next.officialEvents.some(x=>x.kind==='SUBMITTED'&&x.packageId===pack.id&&x.date<=p.date&&x.scope.includes(s)))),'Recorded submission required');
      next.officialEvents.push({id:p.officialId,packageId:pack.id,kind:p.kind,authority:p.authority,number:p.number,reference:p.reference,date:p.date,scope:clone(p.scope),evidence:refs,recordedAt:event.at,recordedBy:event.actor,authenticity:'NOT_AUTOMATICALLY_VERIFIED',packageRelationship:p.date<pack.frozenOn?'RETROSPECTIVE_RECORD':'CONTEMPORARY_RECORD'});break;
    }
    default: throw new Error('Unsupported event type');
  }
  next.events.push(clone(event));
  demand(next.events.length <= 1000, 'Event limit');
  return next;
}
function valid(state) {
  try {
    if (!state || state.schemaVersion !== SCHEMA || !Array.isArray(state.events) || state.events.length > 1000) return false;
    let rebuilt = create(state.assessmentId); const ids = new Set();
    for (const event of state.events) {
      if (ids.has(event.id)) return false; ids.add(event.id);
      rebuilt = reduce(rebuilt, event);
    }
    return canonical(rebuilt) === canonical(state);
  } catch { return false; }
}
function apply(state, event) {
  demand(valid(state), 'Invalid dossier');
  const existing = state.events.find(e => e.id === event?.id);
  if (existing) { demand(canonical(existing) === canonical(event), 'Conflicting event id'); return clone(state); }
  return reduce(state, event);
}
function attach(assessment, dossier) {
  demand(assessment?.id === dossier?.assessmentId && valid(dossier), 'Dossier does not belong to assessment');
  return {...clone(assessment), tpp52: clone(dossier)};
}
function validOptional(assessment) {
  return assessment && (assessment.tpp52 === undefined || (assessment.id === assessment.tpp52?.assessmentId && valid(assessment.tpp52)));
}
function installImportValidator(engine) {
  demand(typeof engine?.validateImport === 'function', 'Existing validator required');
  const previous = engine.validateImport;
  engine.validateImport = value => !!(previous(value) && value.assessments.every(validOptional) && value.history.every(h => validOptional(h.input)));
  return () => { engine.validateImport = previous; };
}
function readiness(dossier) {
  demand(valid(dossier), 'Invalid dossier');
  const open = dossier.remarks.filter(r => r.status !== 'RESOLVED').map(r => r.id);
  return {workflowVersion: SCHEMA, unresolvedRemarkIds: open, allRecordedRemarksReviewed: dossier.remarks.length > 0 && open.length === 0,
    legalReadiness: 'NOT_EVALUATED', productionReadiness: 'NOT_EVALUATED', officialOutcome: 'NOT_INFERRED'};
}
function documentCoverage(dossier,scope){
  demand(valid(dossier)&&scopes(scope),'Invalid coverage scope');
  return scope.map(variantId=>({variantId,documents:dossier.documents.flatMap(d=>{
    const v=d.versions.find(v=>v.id===d.currentVersionId);
    return v.scope.includes(variantId)?[{documentId:d.id,versionId:v.id,title:v.title,format:v.formatReview?.result||'UNDETERMINED'}]:[];
  })}));
}
function requirementSummary(dossier,evaluationDate){
  demand(valid(dossier)&&date(evaluationDate),'Invalid requirement summary');
  const rows=(dossier.requirements||[]).map(r=>{
    const gaps=[];
    if(r.sourceStatus!=='SOURCE_CHECKED')gaps.push('SOURCE_UNCHECKED');
    if(!r.effectiveFrom||evaluationDate<r.effectiveFrom||(r.effectiveTo&&evaluationDate>r.effectiveTo))gaps.push('PERIOD_UNCONFIRMED');
    if(r.recheckReason)gaps.push('RECHECK');
    const originIds=new Set(r.originIds);let repeat=true;
    while(repeat){repeat=false;for(const o of dossier.origins||[])if(originIds.has(o.id))for(const parent of o.parentIds)if(!originIds.has(parent)){originIds.add(parent);repeat=true;}}
    const chain=(dossier.origins||[]).filter(o=>originIds.has(o.id));
    if(chain.some(o=>['LEGAL_REVIEW_REQUIRED','COMPONENT_ORIGIN_UNCONFIRMED'].includes(o.status)||(o.kind!=='RAW_MATERIAL'&&o.status==='RUS_RAW_MATERIAL_ONLY')))gaps.push('ORIGIN_UNCHECKED');
    if(chain.some(o=>!r.scope.every(s=>o.scope.includes(s))))gaps.push('ORIGIN_SCOPE_GAP');
    if(r.action?.requestId&&!dossier.requests?.some(q=>q.id===r.action.requestId&&r.scope.every(s=>q.scope.includes(s))))gaps.push('REQUEST_SCOPE_GAP');
    const v=r.review;
    if(!v||v.production==='NOT_CHECKED')gaps.push('PRODUCTION_UNCHECKED');
    else if(v.production!=='PERFORMED')gaps.push('PRODUCTION_GAP');
    if(!v||v.documentary==='NOT_CHECKED')gaps.push('EVIDENCE_UNCHECKED');
    else if(v.documentary!=='SUFFICIENT')gaps.push('EVIDENCE_GAP');
    return {requirementId:r.id,scope:clone(r.scope),condition:r.condition,gaps,internallyAccepted:gaps.length===0,action:clone(r.action)};
  });
  return {rows,total:rows.length,internallyAccepted:rows.filter(r=>r.internallyAccepted).length,needsWork:rows.filter(r=>!r.internallyAccepted).length,completeness:'NOT_EVALUATED',legalReadiness:'NOT_EVALUATED'};
}
const api = {SCHEMA, create, apply, valid, attach, validOptional, installImportValidator, readiness, documentCoverage, requirementSummary, canonical};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.Tpp52Dossier = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
