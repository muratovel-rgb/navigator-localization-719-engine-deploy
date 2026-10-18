'use strict';
const assert = require('assert');
const A = require('./adapter.js');

const H = A.health();
assert.equal(H.ok,true);
assert.equal(H.serviceVersion,'0.4.2');
assert.equal(H.engineVersion,'0.8.1');
assert(H.ruleIds.includes('flow-coriolis'));

const s = A.searchRules({query:'26.51.52.110'});
assert(s.results.some(x=>x.id==='flow-coriolis'));
assert(s.results.some(x=>x.id==='flow-ultrasonic'));
assert(s.results.some(x=>x.id==='flow-electromagnetic'));

let t = A.thresholdContext({ruleId:'flow-coriolis',date:'2026-10-14',goal:'localization'});
assert.equal(t.context.percent,null);
t = A.thresholdContext({ruleId:'flow-coriolis',date:'2026-10-14',goal:'support'});
assert.equal(t.context.percent,'60');
t = A.thresholdContext({ruleId:'flow-coriolis',date:'2026-10-14',goal:'procurement'});
assert.equal(t.context.percent,null);
assert(/не переносится автоматически/.test(t.context.reason));

// 69.9999% must fail the 70% mounting criterion.
const allFacts = {};
for (const c of A.getRule({ruleId:'flow-coriolis'}).rule.criteria) {
  if (c.mandatory) allFacts[c.id] = {state:'yes', complete:'yes', place:'rf', documentPresent:true};
  else allFacts[c.id] = {state:'yes', complete:'yes', place:'rf', applicable:'yes', documentPresent:true};
}
allFacts.M05.mountedPercent = '69.9999';
allFacts.M07.softwareRussian = 'yes';
allFacts.M07.softwareBasis = 'test';
let r = A.calculateLocalization({ruleId:'flow-coriolis',date:'2026-10-14',goal:'support',classificationConfirmed:true,facts:allFacts});
const m05 = r.result.rows.find(x=>x.id==='M05');
assert.equal(m05.status,'failed');
assert(/менее 70%/.test(m05.reason));

// At exactly 70% it can pass if other facts are valid.
allFacts.M05.mountedPercent = '70';
r = A.calculateLocalization({ruleId:'flow-coriolis',date:'2026-10-14',goal:'support',classificationConfirmed:true,facts:allFacts});
assert.equal(r.result.rows.find(x=>x.id==='M05').status,'met');
assert.equal(r.result.maximum,115);
assert.equal(r.result.limit,69);

// For localization goal, no universal threshold is assigned.
r = A.calculateLocalization({ruleId:'flow-coriolis',date:'2026-10-14',goal:'localization',classificationConfirmed:true,facts:allFacts});
assert.equal(r.result.limit,null);
assert.equal(r.result.status,'unknown');

console.log(JSON.stringify({pass:true,tests:10,engineVersion:H.engineVersion,releaseVersion:H.releaseVersion},null,2));

// API-001: optional transport must equal the existing engine, not a second rule.
const E = require('./engine.js');
const lngEntry = E.entries.find(entry => entry.id === 'lng');
const selectionInput = {ruleId:'lng',date:'2026-10-18',goal:'localization',classificationConfirmed:true};
let selectionChecks = 0;
const equalSelection = (selection, classification = true) => {
  const assessment = E.empty(lngEntry);
  assessment.date = selectionInput.date;
  assessment.goal = selectionInput.goal;
  assessment.classification = classification;
  assessment.selection = {...assessment.selection, ...selection};
  const actual = A.calculateLocalization({...selectionInput,classificationConfirmed:classification,selection});
  assert.deepStrictEqual(actual.result, E.evaluate(lngEntry,assessment,selectionInput.date));
  assert.deepStrictEqual(actual.input.selection, assessment.selection);
  selectionChecks += 2;
  return actual;
};
for (const type of ['BB1','BB2','BB3','BB5','VS1','VS6']) {
  for (const standard of ['gost','inti','both']) {
    const output = equalSelection({equipment:'pump',type,usage:'large_lng',standard});
    assert.equal(output.result.blocked,false);
    assert.equal(output.result.status,'unknown'); // Synthetic missing production facts.
    selectionChecks += 2;
  }
}
for (const selection of [{}, {type:'BB1'}, {equipment:'unit',type:'BB1',usage:'large_lng',standard:'gost'},
  {equipment:'pump',type:'NOT-A-TYPE',usage:'large_lng',standard:'gost'},
  {equipment:'pump',type:'BB1',usage:'other',standard:'gost'},
  {equipment:'pump',type:'BB1',usage:'large_lng',standard:'other'}]) {
  assert.equal(equalSelection(selection).result.blocked,true);
  selectionChecks++;
}
assert.equal(equalSelection({equipment:'pump',type:'BB1',usage:'large_lng',standard:'gost'},false).result.blocked,true);
selectionChecks++;
const missing = A.calculateLocalization(selectionInput);
assert.equal(missing.result.blocked,true);
assert.equal(Object.hasOwn(missing.input,'selection'),false);
selectionChecks += 2;
for (const selection of [null, [], 'pump', {type:1}, {type:'x'.repeat(121)}, {invented:'x'},
  JSON.parse('{"__proto__":"x"}')]) {
  assert.throws(() => A.calculateLocalization({...selectionInput,selection}), /Expected selection/);
  selectionChecks++;
}
const incoming = {equipment:'pump',type:'BB1',usage:'large_lng',standard:'gost'};
const preserved = JSON.stringify(incoming);
const echo = A.calculateLocalization({...selectionInput,selection:incoming});
echo.input.selection.type = 'changed-by-caller';
assert.equal(JSON.stringify(incoming),preserved);
selectionChecks++;
console.log(JSON.stringify({pass:true,api001SelectionChecks:selectionChecks,engineUnchanged:true,syntheticOnly:true,legalApplicabilityVerified:false}));

