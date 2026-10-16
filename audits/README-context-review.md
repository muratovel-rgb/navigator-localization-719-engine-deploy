# Context audit candidate, 15 October 2026

This branch contains a technical review and a proposed search correction. It has not been published to Render or Site. The runtime pp719-index.json, table-context.json, engine.js and measurement-data.js are unchanged.

Reproduce from the existing HTML 0.8 source archive:

```sh
python3 -m pip install -r tools/requirements-context.txt
python3 tools/review-context.py /path/to/kontur-2026-10-14.html --output audits/context-review-2026-10-15.json
npm run test:audit
npm test
```

The review covers all 787 original IDs. New extraction yields 592 single-fragment matches, 74 multiple-fragment matches and 121 without non-empty exact text. Compared with the published context, 29 additional positions have a structural match (28 single and one multiple). The 74 multiple-fragment records separate 72 explicit product-cell continuations from two cases with separate product rows. No fragments are silently merged; the actual cell coordinates and spans remain available.

The 121 missing text matches are explained: 54 exact product rows have empty source cells, 55 have a title mismatch under the same code, 11 index titles contain an editorial exclusion marker, one has a code mismatch. These are diagnostic categories, not verified legal conclusions. An exclusion marker does not itself establish the currently applicable code or rule. A code/title conflict is not resolved by substituting another product.

The extractor now supports two-digit group codes, strips footnote tokens from code matching, detects an adjacent external heading without carrying it across another table, and records the origin and extent of each merged product cell. Across the index, 32 code-token sets differ after mechanical footnote cleanup; the original index is preserved.

The proposed numeric search correction ignores a footnote such as <11> while retaining a real code 11 and real two-digit group codes. It does not change calculations or classify products. Six focused search checks and seven structural parser tests pass. The standard runtime regression and index/context tests also pass against the retained production data.

source-review-2026-10-15.json is a discovery/access log for amendment candidates 1254, 1257 and 1297. Official full-text verification and effective dates are pending. Do not use reported secondary-source dates as accepted normative periods. Some formulas in amendment 1254 are image objects; plain-text extraction is insufficient. No amendment chain is declared complete.

Priority: review the near-term amendment 1297 and its full impact; resolve title/code differences and editorial markers; then prepare rule-level provenance and test cases. Every candidate remains legalVerification=not_verified. No new calculation branch is accepted by this audit.
