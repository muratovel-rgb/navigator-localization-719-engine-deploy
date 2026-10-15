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
    # Footnote numbers are not OKPD2 codes; two-digit section codes are valid.
    value = re.sub(r'<\s*\d+(?:\([^>]*\))?\s*>', ' ', value)
    return tuple(sorted(set(re.findall(r'(?<![\d.])\d{2}(?:\.\d{1,3}){0,3}(?![\d.])', value))))


def cell_text(cell):
    return clean(' '.join(cell.itertext()))


def table_section(table):
    heading = re.search(r'\b([IVX]+)\.\s+', cell_text(table)[:700])
    if heading:
        return heading.group(1)
    # Some annex headings are outside the table. Only cross adjacent editorial
    # paragraphs, never another table or arbitrary preceding document text.
    container = table
    while container.getprevious() is None and container.getparent() is not None:
        container = container.getparent()
    previous = container.getprevious()
    for _ in range(3):
        if previous is None or previous.xpath('.//table'):
            break
        text = cell_text(previous)
        heading = re.match(r'^([IVX]+)\.\s+', text)
        if heading:
            return heading.group(1)
        if text and not text.startswith('(в ред.'):
            break
        previous = previous.getprevious()
    return None


def extract(document):
    candidates = defaultdict(list)
    for table_no, table in enumerate(document.xpath('//table[not(ancestor::table)]')):
        # Restrict extraction to named sections of the industrial-products annex.
        section = table_section(table)
        if not section:
            continue
        rows = table.xpath('./tr|./tbody/tr|./thead/tr')
        row_numbers = {row: n for n, row in enumerate(rows)}
        carried = {}
        for row_no, row in enumerate(rows):
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
            if not codes(code) or not title:
                continue
            anchor = grid[0].xpath('.//a/@name|.//a/@id')
            body_anchor = grid[2].xpath('.//a/@name|.//a/@id')
            item = {'section': section, 'codes': list(codes(code)), 'title': title,
                    'text': body, 'table': table_no, 'row': row_no,
                    'rowAnchor': anchor[0] if anchor else None,
                    'requirementAnchor': body_anchor[0] if body_anchor else None,
                    'requirementRowspan': int(grid[2].get('rowspan', '1')),
                    'productCodeRow': row_numbers[grid[0].getparent()],
                    'productNameRow': row_numbers[grid[1].getparent()],
                    'productCodeRowspan': int(grid[0].get('rowspan', '1')),
                    'productNameRowspan': int(grid[1].get('rowspan', '1')),
                    'inheritedRequirementCell': grid[2].getparent() is not row}
            candidates[(section, codes(code), key(title))].append(item)
    return candidates


def audit(index, snapshot):
    raw = snapshot.read_bytes()
    document = html.fromstring(raw)
    candidates = extract(document)
    records = []
    for position in index['positions']:
        lookup = (position['section'], codes(position['codeText']), key(position['title']))
        exact_rows = candidates.get(lookup, [])
        matches = [row for row in exact_rows if row['text']]
        # Multiple physical rows may represent one product; never silently merge them.
        unique = {(m['table'], m['row']): m for m in matches}
        matches = list(unique.values())
        status = 'matched' if len(matches) == 1 else 'ambiguous' if matches else 'unmatched'
        origins = {(m['table'], m['productCodeRow'], m['productNameRow']) for m in matches}
        structural_relation = ('single_fragment' if len(matches) == 1 else
                               'explicit_product_cell_continuation' if len(matches) > 1 and len(origins) == 1 else
                               'separate_product_rows' if matches else 'no_text_match')
        if matches:
            reason = structural_relation
        elif re.search(r'позици\w*\s+исключен', position['title'], re.I):
            reason = 'index_editorial_exclusion_marker'
        elif exact_rows:
            reason = 'source_requirement_cell_empty'
        elif any(k[0] == lookup[0] and k[2] == lookup[2] for k in candidates):
            reason = 'source_code_conflict'
        elif any(k[0] == lookup[0] and k[1] == lookup[1] for k in candidates):
            reason = 'source_title_conflict'
        else:
            reason = 'no_exact_source_product'
        records.append({'positionId': position['id'], 'status': status,
                        'originalTextNeedsContext': position['textNeedsContext'],
                        'diagnosticReason': reason,
                        'structuralRelationship': structural_relation,
                        'normalizedCodes': list(lookup[1]),
                        'indexedCodeTokensDiffer': set(position['codes']) != set(lookup[1]),
                        'emptySourceRows': [row['row'] for row in exact_rows if not row['text']],
                        'matches': matches})
    canonical = document.xpath('//link[@rel="canonical"]/@href')
    return {'schemaVersion': 2, 'legalVerification': 'not_verified',
            'notice': 'Структура архивной таблицы. Это не подтверждение актуальности редакции или применимости требований.',
            'indexVersion': index['version'],
            'indexCanonicalJsonSha256': hashlib.sha256(json.dumps(index, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
            'source': {'file': snapshot.name, 'sha256': hashlib.sha256(raw).hexdigest(),
                       'url': canonical[0] if canonical else None,
                       'title': clean(' '.join(document.xpath('//title/text()')))},
            'counts': dict(Counter(r['status'] for r in records)),
            'diagnosticCounts': dict(Counter(r['diagnosticReason'] for r in records)),
            'positions': records}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('snapshot', type=Path)
    parser.add_argument('--index', type=Path, default=Path('pp719-index.json'))
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = audit(json.loads(args.index.read_text()), args.snapshot)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'counts': result['counts'], 'needsContextMatched': sum(r['status'] == 'matched' and r['originalTextNeedsContext'] for r in result['positions'])}))
