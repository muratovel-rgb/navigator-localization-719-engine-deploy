#!/usr/bin/env python3
"""Structural parser regression checks; no legal meaning is inferred."""
import importlib.util
import json
import sys
import unittest
import tempfile
from pathlib import Path
from lxml import html

spec = importlib.util.spec_from_file_location('context_audit', Path(__file__).with_name('audit-table-context.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class GridTests(unittest.TestCase):
    def rows(self, rows):
        return module.extract(html.fromstring('<table><tr><td colspan="3">XIII. Test</td></tr>' + rows + '</table>'))

    def test_inherit_only_with_explicit_rowspan(self):
        rows = self.rows('<tr><td>28.14.11</td><td>A</td><td rowspan="2">Shared</td></tr>'
                         '<tr><td>28.14.12</td><td>B</td></tr>'
                         '<tr><td>28.14.13</td><td>C</td><td></td></tr>')
        a = rows[('XIII', ('28.14.11',), 'a')][0]
        b = rows[('XIII', ('28.14.12',), 'b')][0]
        self.assertFalse(a['inheritedRequirementCell'])
        self.assertTrue(b['inheritedRequirementCell'])
        self.assertEqual(b['text'], 'Shared')
        self.assertEqual(rows[('XIII', ('28.14.13',), 'c')][0]['text'], '')

    def test_code_and_name_span_keep_distinct_requirement_fragments(self):
        rows = self.rows('<tr><td rowspan="2">28.14.2</td><td rowspan="2">Parts</td><td>One</td></tr>'
                         '<tr><td>Two</td></tr>')
        matches = rows[('XIII', ('28.14.2',), 'parts')]
        self.assertEqual([m['text'] for m in matches], ['One', 'Two'])

    def test_line_breaks_and_colspan_headers(self):
        rows = self.rows('<tr><td colspan="3">Editorial</td></tr>'
                         '<tr><td>28.14.13</td><td>Valve</td><td>One<br>Two</td></tr>')
        self.assertEqual(rows[('XIII', ('28.14.13',), 'valve')][0]['text'], 'One Two')

    def test_carry_never_crosses_tables(self):
        document = html.fromstring('<main><table><tr><td colspan="3">XIII. Test</td></tr>'
            '<tr><td>28.14.11</td><td>A</td><td rowspan="9">A only</td></tr></table>'
            '<table><tr><td colspan="3">XIV. Test</td></tr>'
            '<tr><td>28.14.12</td><td>B</td><td></td></tr></table></main>')
        self.assertEqual(module.extract(document)[('XIV', ('28.14.12',), 'b')][0]['text'], '')

    def test_two_digit_code_and_footnotes(self):
        self.assertEqual(module.codes('Из 20 <11>'), ('20',))
        self.assertEqual(module.codes('19.20.31 <11>'), ('19.20.31',))
        self.assertEqual(module.codes('11'), ('11',))
        self.assertEqual(module.codes('20.16.10.110 20.16.10.111'), ('20.16.10.110', '20.16.10.111'))

    def test_external_heading_without_crossing_another_table(self):
        document = html.fromstring('<main><p>XXIX. Products</p><p>(в ред. Test)</p>'
            '<div><div><table><tr><td>26.51.12</td><td>A</td><td>One</td></tr></table></div></div>'
            '<table><tr><td>26.51.13</td><td>B</td><td>Two</td></tr></table></main>')
        rows = module.extract(document)
        self.assertIn(('XXIX', ('26.51.12',), 'a'), rows)
        self.assertNotIn(('XXIX', ('26.51.13',), 'b'), rows)

    def test_diagnostics_preserve_multiple_fragments_and_empty_cell(self):
        document = ('<table><tr><td colspan="3">XIII. Test</td></tr>'
            '<tr><td rowspan="2">28.14.2</td><td rowspan="2">Parts</td><td>One</td></tr>'
            '<tr><td>Two</td></tr><tr><td>28.14.13</td><td>Valve</td><td></td></tr></table>')
        index = {'version': 'test', 'positions': [
            {'id': 'p', 'section': 'XIII', 'codeText': '28.14.2', 'codes': ['28.14.2'], 'title': 'Parts', 'textNeedsContext': False},
            {'id': 'v', 'section': 'XIII', 'codeText': '28.14.13', 'codes': ['28.14.13'], 'title': 'Valve', 'textNeedsContext': True}]}
        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / 'snapshot.html'
            snapshot.write_text(document)
            result = module.audit(index, snapshot)
        a, b = result['positions']
        self.assertEqual(a['status'], 'ambiguous')
        self.assertEqual(a['structuralRelationship'], 'explicit_product_cell_continuation')
        self.assertEqual([m['text'] for m in a['matches']], ['One', 'Two'])
        self.assertEqual(b['diagnosticReason'], 'source_requirement_cell_empty')
        self.assertEqual(b['matches'], [])
        self.assertEqual(result['legalVerification'], 'not_verified')


if __name__ == '__main__':
    unittest.main()
