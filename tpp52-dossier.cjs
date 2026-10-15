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
function reduce(state, event) {
  demand(event && id(event.id) && text(event.actor, 200), 'Invalid event identity');
  demand(typeof event.at === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(event.at) && new Date(event.at).toISOString() === event.at, 'Invalid event time');
  demand(!state.events.length || event.at >= state.events.at(-1).at, 'Event time precedes prior event');
  demand(event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload), 'Invalid event payload');
  const next = clone(state), p = event.payload;
  const remark = () => { const r = next.remarks.find(r => r.id === p.remarkId); demand(r, 'Remark not found'); return r; };
  switch (event.type) {
    case 'document.version': {
      demand(id(p.documentId) && id(p.versionId) && text(p.title, 500) && list(p.scope), 'Invalid document');
      demand(typeof p.checksum === 'string' && /^[a-f0-9]{64}$/.test(p.checksum), 'SHA-256 required');
      let doc = next.documents.find(d => d.id === p.documentId);
      if (!doc) { demand(next.documents.length < 200, 'Document limit'); doc = {id: p.documentId, currentVersionId: '', versions: []}; next.documents.push(doc); }
      demand(!doc.versions.some(v => v.id === p.versionId), 'Document version already exists');
      const oldVersion = doc.currentVersionId;
      doc.versions.push({id: p.versionId, title: p.title, checksum: p.checksum, scope: clone(p.scope), recordedAt: event.at, recordedBy: event.actor});
      doc.currentVersionId = p.versionId;
      if (oldVersion) for (const r of next.remarks) {
        if (r.documentIds.includes(doc.id) || r.evidence.some(e => e.documentId === doc.id) || r.officialDecisions.some(d => d.evidence.some(e => e.documentId === doc.id))) {
          r.status = 'REOPENED'; r.recheckReason = 'Document version changed';
          r.recheckEventId = event.id;
          // A prior official decision remains a historical fact, not approval
          // of the replacement document.
        }
      }
      break;
    }
    case 'remark.open': {
      demand(id(p.remarkId) && !next.remarks.some(r => r.id === p.remarkId) && next.remarks.length < 200, 'Invalid or duplicate remark');
      demand(['TPP','INTERNAL','MINPROMTORG'].includes(p.source) && text(p.text) && /^P(0[1-9]|[1-4][0-9]|5[0-4])$/.test(p.checkId), 'Invalid remark content');
      demand(list(p.scope) && p.scope.length > 0 && list(p.documentIds), 'Invalid remark scope');
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
module.exports = {SCHEMA, create, apply, valid, attach, validOptional, installImportValidator, readiness};
