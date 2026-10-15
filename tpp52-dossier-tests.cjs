'use strict';
const assert = require('node:assert/strict');
const T = require('./tpp52-dossier.cjs');
const E = require('./engine.js');
let seq = 0, passed = 0;
const event = (type, payload) => ({id:'event-'+(++seq),at:'2026-10-15T14:20:00.000Z',actor:'test-reviewer',type,payload});
const hash = 'a'.repeat(64);
const version = (id, v, scope=['variant-01']) => event('document.version',{documentId:id,versionId:v,title:'Synthetic evidence',checksum:hash,scope});
const open = (id, scope=['variant-01'], docs=['doc-01']) => event('remark.open',{remarkId:id,source:'TPP',text:'Synthetic evidence gap',checkId:'P15',scope,documentIds:docs});
const ref = (v='v1') => [{documentId:'doc-01',versionId:v}];
function test(name, fn) { fn(); passed++; console.log('PASS '+name); }
let base = T.apply(T.create('assessment-test'),version('doc-01','v1'));
base = T.apply(base,open('remark-01'));
test('legacy JSON remains accepted',()=>{
 const a=E.empty(E.entries[0]);assert(E.validateImport({formatVersion:2,assessments:[a],history:[]}));
});
test('updates leave previous dossier unchanged',()=>{
 const before=JSON.stringify(base);T.apply(base,event('remark.receive',{remarkId:'remark-01',answer:'Uploaded',evidence:ref()}));assert.equal(JSON.stringify(base),before);
});
test('receipt never closes a remark',()=>{
 const s=T.apply(base,event('remark.receive',{remarkId:'remark-01',answer:'Uploaded',evidence:ref()}));assert.equal(s.remarks[0].status,'DOCUMENT_RECEIVED');
 assert.throws(()=>T.apply(base,event('remark.receive',{remarkId:'remark-01',answer:'No document',evidence:[]})));
});
test('resolution requires both basis and evidence',()=>{
 assert.throws(()=>T.apply(base,event('remark.review',{remarkId:'remark-01',result:'RESOLVED',basis:'Reviewed',evidence:[]})));
 assert.throws(()=>T.apply(base,event('remark.review',{remarkId:'remark-01',result:'RESOLVED',basis:'',evidence:ref()})));
});
let resolved=T.apply(base,event('remark.review',{remarkId:'remark-01',result:'RESOLVED',basis:'Reviewed current evidence',evidence:ref()}));
test('internal review never invents TPP approval',()=>{
 assert.equal(resolved.remarks[0].status,'RESOLVED');assert.equal(resolved.remarks[0].officialDecisions.length,0);assert.equal(T.readiness(resolved).officialOutcome,'NOT_INFERRED');
});
test('replacement reopens dependent remark and preserves old review',()=>{
 const s=T.apply(resolved,version('doc-01','v2'));assert.equal(s.remarks[0].status,'REOPENED');assert.equal(s.remarks[0].lastReview.evidence[0].versionId,'v1');assert.equal(s.documents[0].versions.length,2);
});
test('superseded evidence cannot resolve a new review',()=>{
 const s=T.apply(resolved,version('doc-01','v2'));assert.throws(()=>T.apply(s,event('remark.review',{remarkId:'remark-01',result:'RESOLVED',basis:'Old evidence',evidence:ref()})));
});
test('one variant cannot close a multi-variant remark',()=>{
 const s=T.apply(base,open('remark-series',['variant-01','variant-02']));assert.throws(()=>T.apply(s,event('remark.review',{remarkId:'remark-series',result:'RESOLVED',basis:'Only one variant',evidence:ref()})));
});
test('resolution of one remark does not close another',()=>{
 const s=T.apply(resolved,open('remark-02'));assert.equal(s.remarks[0].status,'RESOLVED');assert.equal(s.remarks[1].status,'OPEN');
});
test('duplicate event is idempotent but conflicts fail',()=>{
 const e=version('doc-02','v1');const s=T.apply(base,e);assert.deepEqual(T.apply(s,e),s);assert.throws(()=>T.apply(s,{...e,actor:'different'}));
});
test('official decision has its own evidence and historical version',()=>{
 const s=T.apply(resolved,event('remark.official_decision',{remarkId:'remark-01',decision:'ACCEPTED',reference:'Synthetic external record',evidence:ref()}));
 const r=T.apply(s,version('doc-01','v2'));assert.equal(r.remarks[0].status,'REOPENED');assert.equal(r.remarks[0].officialDecisions[0].evidence[0].versionId,'v1');
});
test('import validates dossier and historical snapshots',()=>{
 const uninstall=T.installImportValidator(E);try {
  const a=E.empty(E.entries[0]);a.id=base.assessmentId;
  const withDossier=T.attach(a,base);const payload={formatVersion:2,assessments:[withDossier],history:[]};assert(E.validateImport(payload));assert(E.validateImport(JSON.parse(JSON.stringify(payload))));
  const tampered=JSON.parse(JSON.stringify(payload));tampered.assessments[0].tpp52.remarks[0].status='RESOLVED';assert(!E.validateImport(tampered));
  const foreign=JSON.parse(JSON.stringify(payload));foreign.assessments[0].tpp52.assessmentId='other';assert(!E.validateImport(foreign));
  const snapshot=E.createSnapshot(E.entries[0],withDossier);const historyPayload={formatVersion:2,assessments:[a],history:[snapshot]};assert(E.validateImport(historyPayload));
  const broken=JSON.parse(JSON.stringify(historyPayload));broken.history[0].input.tpp52.events=[];assert(!E.validateImport(broken));
 } finally {uninstall();}
});
test('no remarks cannot imply readiness',()=>{assert.equal(T.readiness(T.create('empty')).allRecordedRemarksReviewed,false);});
test('invalid date and unknown command fail',()=>{
 assert.throws(()=>T.apply(base,{...version('doc-02','v1'),at:'2026-02-30T14:20:00.000Z'}));assert.throws(()=>T.apply(base,event('grant-origin',{country:'RU'})));
});
test('serialized state can be verified by replay',()=>{
 assert(T.valid(JSON.parse(JSON.stringify(resolved))));const bad=JSON.parse(JSON.stringify(resolved));bad.documents[0].versions[0].checksum='b'.repeat(64);assert(!T.valid(bad));
});
test('approved design does not activate unverified normative checks',()=>{
 const c=require('./tpp52-checks.draft.json');assert.equal(c.checks.length,54);assert.equal(new Set(c.checks.map(x=>x.id)).size,54);assert.equal(c.designApproved,true);assert.equal(c.normativeExecutionEnabled,false);assert(c.checks.every(x=>x.legalVerification==='not_verified'));
});
console.log(JSON.stringify({pass:true,checks:passed,normativeRulesActivated:false,syntheticOnly:true}));
