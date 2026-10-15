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
    foreignLimit: e.foreignLimit ?? null,
    thresholdPolicy: e.thresholdPolicy ?? null,
    periods: e.periods ?? null,
    criteria: e.criteria.map(c => ({
      id: c.id,
      name: c.name,
      mandatory: c.mandatory,
      points: c.points || 0,
      territory: c.territory ?? null,
      exclusionReasonRequired: !!c.exclusionReasonRequired,
      minMountedPercent: c.minMountedPercent ?? null,
      russianSoftware: !!c.russianSoftware,
      manufactureOrUse: !!c.manufactureOrUse,
      originRequired: !!c.originRequired,
      originTerritories: c.originTerritories ?? null,
      creditGroup: c.creditGroup,
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
    if (!Object.hasOwn(assessment.facts, criterionId)) throw new Error(`Unknown criterionId: ${criterionId}`);
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
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date+'T00:00:00Z').toISOString().slice(0,10) !== date) throw new Error('Invalid calendar date');
  if (!['localization','registry','support','procurement'].includes(goal)) throw new Error('Unknown goal');
  let maximum = entry.maximum ?? null;
  if (entry.method === 'points' && Array.isArray(applicableCriterionIds)) {
    const ids = new Set(applicableCriterionIds);
    if (ids.size !== applicableCriterionIds.length || [...ids].some(id => !entry.criteria.some(c => c.id === id && c.points > 0))) throw new Error('Expected unique scored criterion IDs from this rule');
    const groups = new Map();
    for (const c of entry.criteria.filter(c => c.points && ids.has(c.id))) groups.set(c.creditGroup, Math.max(groups.get(c.creditGroup) || 0, c.points));
    maximum = [...groups.values()].reduce((s,p)=>s+p,0);
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
    calculationRules: E.entries.filter(e => e.method !== 'unresolved').length,
    unresolvedRules: E.entries.filter(e => e.method === 'unresolved').length,
    ruleIds: E.entries.map(e => e.id)
  };
}

module.exports = { health, searchRules, getRule, calculateLocalization, thresholdContext };

