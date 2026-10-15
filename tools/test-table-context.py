#!/usr/bin/env python3
"""Structural parser regression checks; no legal meaning is inferred."""
import importlib.util
import json
import sys
import unittest
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
        self.assertNotIn(('XIII', ('28.14.13',), 'c'), rows)

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
        self.assertNotIn(('XIV', ('28.14.12',), 'b'), module.extract(document))


if __name__ == '__main__':
    unittest.main()
