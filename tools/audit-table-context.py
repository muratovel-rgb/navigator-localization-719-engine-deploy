#!/usr/bin/env python3
"""Recover *structural* context from an archived table, without legal verification.

Requires lxml. Input is the original HTML snapshot, never fetched implicitly.
No changes to the source index, calculation rules or effective dates.
"""
import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from lxml import html


def clean(value):
    return re.sub(r'\s+', ' ', value.replace('\xa0', ' ')).strip()


def key(value):
    return re.sub(r'[^а-яa-z0-9]', '', clean(value).lower().replace('ё', 'е'))


def codes(value):
    return tuple(sorted(set(re.findall(r'\d{2}(?:\.\d{1,3}){1,4}', value))))


def cell_text(cell):
    return clean(' '.join(cell.itertext()))


def extract(document):
    candidates = defaultdict(list)
    for table_no, table in enumerate(document.xpath('//table[not(ancestor::table)]')):
        # Restrict extraction to named sections of the industrial-products annex.
        heading = re.search(r'\b([IVX]+)\.\s+', cell_text(table)[:700])
        if not heading:
            continue
        section = heading.group(1)
        carried = {}
        for row_no, row in enumerate(table.xpath('./tr|./tbody/tr|./thead/tr')):
            grid = {col: item[0] for col, item in carried.items()}
            following = {col: (cell, left - 1) for col, (cell, left) in carried.items() if left > 1}
            col = 0
            for cell in row.xpath('./td|./th'):
                while col in grid:
                    col += 1
                colspan = int(cell.get('colspan', '1'))
                rowspan = int(cell.get('rowspan', '1'))
                for offset in range(colspan):
                    grid[col + offset] = cell
                    if rowspan > 1:
                        following[col + offset] = (cell, rowspan - 1)
                col += colspan
            carried = following
            if not all(i in grid for i in range(3)) or len({id(grid[i]) for i in range(3)}) != 3:
                continue
            code, title, body = (cell_text(grid[i]) for i in range(3))
            if not codes(code) or not title or not body:
                continue
            anchor = grid[0].xpath('.//a/@name|.//a/@id')
            body_anchor = grid[2].xpath('.//a/@name|.//a/@id')
            item = {'section': section, 'codes': list(codes(code)), 'title': title,
                    'text': body, 'table': table_no, 'row': row_no,
                    'rowAnchor': anchor[0] if anchor else None,
                    'requirementAnchor': body_anchor[0] if body_anchor else None,
                    'requirementRowspan': int(grid[2].get('rowspan', '1')),
                    'inheritedRequirementCell': grid[2].getparent() is not row}
            candidates[(section, codes(code), key(title))].append(item)
    return candidates


def audit(index, snapshot):
    raw = snapshot.read_bytes()
    document = html.fromstring(raw)
    candidates = extract(document)
    records = []
    for position in index['positions']:
        matches = candidates.get((position['section'], tuple(sorted(set(position['codes']))), key(position['title'])), [])
        # Multiple physical rows may represent one product; never silently merge them.
        unique = {(m['table'], m['row']): m for m in matches}
        matches = list(unique.values())
        status = 'matched' if len(matches) == 1 else 'ambiguous' if matches else 'unmatched'
        records.append({'positionId': position['id'], 'status': status,
                        'originalTextNeedsContext': position['textNeedsContext'],
                        'matches': matches})
    canonical = document.xpath('//link[@rel="canonical"]/@href')
    return {'schemaVersion': 1, 'legalVerification': 'not_verified',
            'notice': 'Структура архивной таблицы. Это не подтверждение актуальности редакции или применимости требований.',
            'indexVersion': index['version'],
            'indexCanonicalJsonSha256': hashlib.sha256(json.dumps(index, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
            'source': {'file': snapshot.name, 'sha256': hashlib.sha256(raw).hexdigest(),
                       'url': canonical[0] if canonical else None,
                       'title': clean(' '.join(document.xpath('//title/text()')))},
            'counts': dict(Counter(r['status'] for r in records)), 'positions': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--index', type=Path, default=Path('pp719-index.json'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = audit(json.loads(args.index.read_text()), args.snapshot)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'counts': result['counts'], 'needsContextMatched': sum(r['status'] == 'matched' and r['originalTextNeedsContext'] for r in result['positions'])}))
