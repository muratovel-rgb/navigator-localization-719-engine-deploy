'use strict';
const assert = require('assert');
const A = require('./adapter.js');

const H = A.health();
assert.equal(H.ok,true);
assert.equal(H.engineVersion,'0.7.0');
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
