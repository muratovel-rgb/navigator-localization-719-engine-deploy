'use strict';
const E = require('./engine.js');

function findRule(ruleId) {
  const entry = E.entries.find(e => e.id === ruleId);
  if (!entry) throw new Error(`Unknown ruleId: ${ruleId}`);
  return entry;
}

function summarizeRule(e) {
  return {
    id: e.id,
    code: e.code,
    title: e.title,
    method: e.method,
    maximum: e.maximum ?? null,
    legalFrom: e.legalFrom ?? null,
    verifiedFrom: e.verifiedFrom ?? null,
    version: e.version,
    source: e.source,
    scope: e.scope,
    review: e.review,
    criteria: e.criteria.map(c => ({
      id: c.id,
      name: c.name,
      mandatory: c.mandatory,
      points: c.points || 0,
      territory: c.territory ?? null,
      exclusionReasonRequired: !!c.exclusionReasonRequired,
      minMountedPercent: c.minMountedPercent ?? null,
      russianSoftware: !!c.russianSoftware,
      evidence: c.evidence ?? null,
      description: c.description ?? null
    }))
  };
}

function searchRules({ query }) {
  return {
    engineVersion: E.VERSION,
    releaseVersion: E.RELEASE,
    query,
    results: E.search(query).map(e => ({
      id: e.id, code: e.code, title: e.title, method: e.method,
      maximum: e.maximum ?? null, version: e.version, source: e.source,
      scope: e.scope, criteriaCount: e.criteria.length
    }))
  };
}

function getRule({ ruleId }) {
  return {
    engineVersion: E.VERSION,
    releaseVersion: E.RELEASE,
    rule: summarizeRule(findRule(ruleId))
  };
}

function applyFacts(assessment, facts = {}) {
  for (const [criterionId, patch] of Object.entries(facts)) {
    if (!assessment.facts[criterionId]) throw new Error(`Unknown criterionId: ${criterionId}`);
    const allowed = [
      'state','complete','place','documentPresent','reference','executor','performer',
      'applicable','basis','years','origin','originBasis','route','diameterOnly',
      'includesPressureBody','validFrom','validUntil','exclusionReason','mountedPercent',
      'softwareRussian','softwareBasis'
    ];
    for (const [k,v] of Object.entries(patch || {})) {
      if (!allowed.includes(k)) throw new Error(`Unsupported fact field ${criterionId}.${k}`);
      assessment.facts[criterionId][k] = v;
    }
  }
}

function calculateLocalization(input) {
  const {
    ruleId,
    date,
    goal = 'localization',
    classificationConfirmed = false,
    facts = {},
    costs = null,
    name = '',
    characteristics = ''
  } = input || {};
  const entry = findRule(ruleId);
  const a = E.empty(entry);
  if (date) a.date = date;
  a.goal = goal;
  a.classification = !!classificationConfirmed;
  a.name = name || a.name;
  a.characteristics = characteristics || '';
  applyFacts(a, facts);
  if (costs) a.costs = {...a.costs, ...costs};
  const result = E.evaluate(entry, a, a.date);
  return {
    engineVersion: E.VERSION,
    releaseVersion: E.RELEASE,
    ruleVersion: entry.version,
    rule: {id: entry.id, code: entry.code, title: entry.title, method: entry.method},
    input: {
      date: a.date,
      goal: a.goal,
      classificationConfirmed: a.classification,
      facts,
      costs: costs || undefined
    },
    result
  };
}

function thresholdContext({ ruleId, date, goal = 'localization', applicableCriterionIds = null }) {
  const entry = findRule(ruleId);
  let maximum = entry.maximum ?? null;
  if (entry.method === 'points' && Array.isArray(applicableCriterionIds)) {
    const ids = new Set(applicableCriterionIds);
    maximum = entry.criteria.filter(c => c.points && ids.has(c.id)).reduce((s,c)=>s+c.points,0);
  }
  return {
    engineVersion: E.VERSION,
    releaseVersion: E.RELEASE,
    ruleId,
    date,
    goal,
    applicableMaximum: maximum,
    context: E.thresholdInfo(entry, date, goal),
    threshold: maximum ? E.threshold(date, maximum, entry, goal) : null
  };
}

function health() {
  return {
    ok: true,
    engineVersion: E.VERSION,
    releaseVersion: E.RELEASE,
    rules: E.entries.length,
    ruleIds: E.entries.map(e => e.id)
  };
}

module.exports = { health, searchRules, getRule, calculateLocalization, thresholdContext };
