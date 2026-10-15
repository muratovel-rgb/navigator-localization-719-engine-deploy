# 0.3.0 service / 0.8.1 engine (prepared, not deployed)

- Adds pressure sensors (125), moisture meters (160), gas analyzers (175) from HTML 0.8. The numbers are full applicable maxima, not registry thresholds.
- Forwards selected entry and goal to the existing exact threshold function. Corrects Render's accidental LNG threshold fallback; keeps evaluate() logic unchanged.
- Exposes component-use alternatives, permitted origins, foreign share limit, threshold policy and credit groups in get_localization_rule.
- Keeps rules/ruleIds for compatibility; adds calculationRules=9 and unresolvedRules=2.
- Generates Site ESM directly from the same CommonJS sources with SHA-256 provenance. No separate maintained rule implementation.
- Does not export the product-specific unresolved RZBA card to shared server code.
- Preserves five tool names and existing fact fields. Does not add LNG selection or BOM inputs.

## Validation

`npm test` runs the existing boundary tests and expanded regression suite. For exact parity against the local HTML source archive:

```
NAVIGATOR_HTML_SOURCE=/absolute/path/to/localization-prototype-v0.8 npm test
```

This adds full rule-object and result comparisons for the 11 exported entries. The additional local RZBA card is intentionally excluded. Tests verify ESM/CommonJS parity, threshold contexts, new component alternatives, 70% boundaries and JSON snapshots. Regulatory completeness and current official law are not certified by these tests.

## Publication and rollback

This branch does not publish a service. Review and production authorization are separate. Before deployment record the actual deployed Render commit and current Site version; do not infer either from main. Keep the existing URLs, access controls and data handling. Publish both existing interfaces from the same source revision, then verify both through their actual MCP connections. If verification fails, restore the recorded Render deployment and Site version 1 (or the actual live version recorded immediately before publication).

## Remaining debt

- Engine LNG selection cannot be supplied through the present calculate tool.
- BOM lines are not supported by the adapter.
- Component alternatives still require expert normative acceptance; universal registry threshold is intentionally not assigned.
- All 787 index rows are not calculation rules; full index is not added to MCP search.
