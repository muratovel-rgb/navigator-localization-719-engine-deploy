# Amendment impact review, 15 October 2026

Review only. No production rule, threshold, accepted legal period or normative approval status is changed.

The source register now records official publication identifiers for acts 1254 (0001202609300041), 1257 (0001202609300049) and 1297 (0001202610060054). Official full-text retrieval has not succeeded. Discovery of a publication is not verification of every annex cell.

Eight change groups are described in amendment-impact-2026-10-15.json:

1. Automotive R&D credits in footnote 12, act 1254: image formulas and period-dependent limits need visual/source verification.
2. New sewing-needle position and note 10, act 1257. The separate PP1875 provision is not part of the localization rule.
3. Medical products in section VII, act 1297: 48 existing section rows are review candidates, not 48 confirmed amendments.
4. Mattresses in section XI and future act 1026: narrow the code and exclude medical products.
5. Bedding, workwear and protective footwear in section XVII: purpose-based separation from medical products.
6. Rubber products in section XXI: narrow applicability and exclude medical products.
7. New medical cross-references and year-specific product/configuration thresholds: footnotes 61-66, note 28 and new note 80(1).
8. Future railway references in act 1135: renumber footnotes 61/62 to 67/68; these are different references from medical footnotes. Do not activate future railway requirements in October 2026.

Act 1297 has a recorded effective-date conflict: Alta-Soft reports 16 October 2026, Garant reports 17 October 2026; official publication metadata indicates 6 October. The reviewed text specifies expiry of ten days from official publication. approvedEffectiveDate remains null; date selection must not silently use the first source. Sources and the unresolved conflict are explicit in source-review-2026-10-15.json.

sewing-needle-rule-candidate.json is a draft, not a tenth implemented branch: 15 proposed scored criteria, arithmetic weight sum 145, product-specific threshold candidate 115, separate mandatory documentation/applicant condition, pending date/source/evidence approval. No executable calculator was added.

Run npm run test:audit to validate the structural parser, search correction and audit-record gates. The amendment checker validates references, totals, required review statuses and date-conflict preservation; it does not validate the law itself. Numerical boundary scenarios are specifications for the future shared-engine implementation, not completed calculation acceptance tests.
