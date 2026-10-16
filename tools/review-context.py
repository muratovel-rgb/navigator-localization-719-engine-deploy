#!/usr/bin/env python3
"""Build a compact, reproducible diagnostic review; never replace runtime data."""
import argparse
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('table_context', Path(__file__).with_name('audit-table-context.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('snapshot', type=Path)
parser.add_argument('--index', type=Path, default=Path('pp719-index.json'))
parser.add_argument('--baseline', type=Path, default=Path('table-context.json'))
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
index = json.loads(args.index.read_text())
baseline = json.loads(args.baseline.read_text())
by_id = {p['id']: p for p in index['positions']}
old = {p['positionId']: p for p in baseline['positions']}
review = module.audit(index, args.snapshot)
review['productionContextCounts'] = baseline['counts']
review['candidateOnly'] = True
for record in review['positions']:
    source = by_id[record['positionId']]
    record.update(section=source['section'], codeText=source['codeText'], title=source['title'], productionStatus=old[record['positionId']]['status'])
    record['fragments'] = [{k: v for k, v in m.items() if k not in ['text', 'title', 'codes']} for m in record.pop('matches')]
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(review, ensure_ascii=False, indent=2)+'\n')
assert len(review['positions']) == len(by_id)
assert sum(review['diagnosticCounts'].values()) == len(by_id)
print(json.dumps({'candidateOnly':True,'counts':review['counts'],'diagnostics':review['diagnosticCounts']}))
