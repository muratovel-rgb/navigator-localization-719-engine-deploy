#!/usr/bin/env python3
"""Validate review records and safety gates, not legal interpretations."""
import json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
read=lambda p: json.loads((root/p).read_text())
index=read('pp719-index.json'); positions={p['id']:p for p in index['positions']}
impact=read('audits/amendment-impact-2026-10-15.json')
assert impact['productionRulesChanged'] is False
for change in impact['changes']:
 assert change['productionActivation'] is False and change['approvedEffectiveDate'] is None
 assert change['legalVerification']=='not_verified' and change['evidence']
 for id in change['existingPositionIds']:
  assert id in positions and positions[id]['section'] in change['sections']
registry=read('audits/source-review-2026-10-15.json')
act=next(a for a in registry['sources'] if a['act']=='2026-10-05-1297')
assert act['effectiveDateConflict'] is True and act['approvedEffectiveDate'] is None
assert {x['date'] for x in act['reportedEffectiveDates']}=={'2026-10-16','2026-10-17'}
draft=read('audits/sewing-needle-rule-candidate.json')
assert draft['engineIntegration'] is None and draft['productionActivation'] is False
assert draft['thresholdCandidate']['approved'] is False
assert len({c['proposedId'] for c in draft['criteriaCandidate']})==15
assert sum(c['points'] for c in draft['criteriaCandidate'])==draft['arithmeticSumOfListedWeights']==145
assert draft['thresholdCandidate']['points']==115
assert not any(draft['code'] in p['codes'] for p in index['positions'])
print(json.dumps({'pass':True,'reviewGroups':len(impact['changes']),'draftCriteria':15,'draftArithmeticCheck':145,'dateConflictPreserved':True,'productionActivation':False}))
