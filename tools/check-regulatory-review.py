#!/usr/bin/env python3
"""Check review completeness and non-activation, without interpreting legislation."""
import hashlib,json,pathlib,copy
ROOT=pathlib.Path(__file__).resolve().parent.parent
AUDIT=ROOT/'audits/2026-10-16'
read=lambda name:json.loads((AUDIT/name).read_text())

def validate(changes,gates,coverage,sources,matrix):
 assert changes['fullLegalCoverageVerified'] is False
 assert changes['absenceOfAmendmentsProven'] is False
 assert changes['productionRulesChanged'] is False
 assert gates['productionActivation'] is False and gates['productionDeployed'] is False
 assert gates['approval']['tableApprovedByUser'] is False
 assert gates['officialChainVerified'] is False
 assert all(v is None for v in gates['acceptedEffectiveDates'].values())
 assert set(gates['reported1297Dates'])=={'2026-10-16','2026-10-17'}
 assert all(c['productionActivation'] is False and c['legalVerification']=='not_verified' and c['approvedEffectiveDate'] is None for c in changes['changes'])
 assert len({s['section'] for s in coverage['sections']})==29
 assert len({p['positionId'] for p in coverage['positions']})==len(coverage['positions'])==787
 assert sum(coverage['counts'].values())==787
 assert all(p['productionActivation'] is False for p in coverage['positions'])
 assert all(p['productionActivation'] is False for p in changes['exclusionCandidates'])
 assert {c['id'] for c in matrix['checks']}=={'P'+str(n).zfill(2) for n in range(1,55)}
 assert matrix['normativeExecutionEnabled'] is False
 for s in sources:
  if 'error' in s: assert not s.get('officialFullTextVerified')
  if s.get('accessWall'): assert not s.get('officialFullTextVerified')

def run():
 changes,gates,coverage,sources,matrix=(read(n) for n in ['changes.json','gates.json','coverage.json','sources.json','tpp52-matrix-review.json'])
 validate(changes,gates,coverage,sources,matrix)
 baseline=read('baseline.json')
 for f in baseline['files']:
  b=(ROOT/f['path']).read_bytes()
  assert hashlib.sha256(b).hexdigest()==f['sha256'], 'Baseline file changed: '+f['path']
 for s in sources:
  if 'archivedExtract' in s:
   e=s['archivedExtract'];assert hashlib.sha256((ROOT/e['path']).read_bytes()).hexdigest()==e['sha256']
 rejected=0
 for mutation in ['activate','date','approval','drop_position','drop_matrix_check','false_official_verification']:
  c,g,v,s,m=copy.deepcopy((changes,gates,coverage,sources,matrix))
  if mutation=='activate':c['changes'][0]['productionActivation']=True
  elif mutation=='date':g['acceptedEffectiveDates']['2026-10-05-1297']='2026-10-16'
  elif mutation=='approval':g['approval']['tableApprovedByUser']=True
  elif mutation=='drop_position':v['positions'].pop()
  elif mutation=='drop_matrix_check':m['checks'].pop()
  else:next(x for x in s if 'error' in x)['officialFullTextVerified']=True
  try:validate(c,g,v,s,m)
  except AssertionError:rejected+=1
  else:raise AssertionError('Unsafe mutation accepted: '+mutation)
 print(json.dumps({'pass':True,'baselineFilesUnchanged':len(baseline['files']),'sections':29,'positions':787,'matrixChecks':54,'unsafeMutationsRejected':rejected,'legalVerification':False}))

if __name__=='__main__':run()
