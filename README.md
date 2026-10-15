# Navigator Localization 719 MCP v0.3.0 prepared update

Deterministic calculation service extracted from `localization-prototype-v0.8.html`.

## Tools

- `engine_health` — engine/release version and prepared rules.
- `search_localization_rules` — search all 787 indexed positions and prepared calculation branches.
- `get_localization_rule` — retrieve the selected rule and criterion IDs.
- `get_threshold_context` — resolve threshold purpose/date without inventing a universal threshold.
- `calculate_localization` — execute the Navigator HTML 0.8 calculation engine.

## Architectural boundary

The ChatGPT skill remains responsible for legal applicability, current-source verification, GAP analysis and localization planning. This service performs deterministic calculations only for branches already implemented in HTML 0.8.

It does not create an official conclusion, act, registry record, or legal status.

## Run

```bash
npm install
npm test
npm start
```

MCP endpoint: `POST /mcp`  
Health endpoint: `GET /health`

## Current prepared branches

- Coriolis flowmeters
- Ultrasonic flowmeters
- Electromagnetic flowmeters
- Level meters
- Rotary positive-displacement pumps
- LNG process pumps
- unresolved selector branches retained for safe blocking

## Tests

`node test.cjs` currently covers 11 core invariants including:
- search by OKPD2;
- no universal localization threshold;
- 60% support context kept separate;
- no automatic extension of 2023–2025 procurement thresholds into 2026;
- 69.9999% fails a `>=70%` condition;
- 70% boundary behavior;

## Deployment

See `DEPLOY_RENDER.md`, `render.yaml`, `SECURITY.md`, and `MCP_TOOL_CONTRACT.md`.

## Public deploy boundary

This deployment package intentionally excludes enterprise-specific pilots, registry identifiers, customer files, and private evidence. The private ChatGPT skill remains the source for such case context.


## Shared core and Site adapter

Engine 0.8.1 contains HTML 0.8 rule data and a corrected threshold forwarding helper. See CHANGELOG.md for scope and validation. A prepared update is not a production deployment.

There are 11 catalog entries: 9 calculations and 2 unresolved selectors. `rules` remains the catalog count for compatibility; use `calculationRules` for calculation coverage. Product-specific RZBA data stays in local HTML.

Generate modules for the existing Site checkout without publishing:

```bash
node build-site-modules.cjs /absolute/path/to/existing-site/lib/navigator
```

The generator performs checked module-format replacements, copies rule data and records SHA-256 source/output hashes. Do not edit generated files manually. The Site runs these generated modules locally; it is not a transparent Render proxy. Both interfaces must be built from the same source revision.

## Full-index search, service 0.4.0

search_localization_rules now searches all 787 positions from the existing HTML index (29 sections) plus the prepared rule catalog. It accepts optional limit (1–100, default 20) and offset. nextOffset paginates broad queries. Results distinguish prepared_rule from indexed_position and disclose calculationAvailable. Indexed position IDs can be passed to get_localization_rule for full source text, editorial notes, context and effective-period fields. A prepared mapped position resolves to its prepared rule; otherwise calculation remains blocked and no threshold is invented.

Health separates indexedPositions=787, indexedSections=29, calculationRules=9, unresolvedRules=2 and legacy catalog rules=11. fullLegalCoverageVerified remains false. Data are transferred unchanged from HTML 0.8; missing context and uncertain dates are not silently repaired. The import expands retrieval coverage, not verified computational coverage.


## Archived table context, service 0.4.1

`get_localization_rule` adds `requirementContext` for indexed IDs. It contains the archived source title, URL, SHA-256, exact table/row anchors, explicit rowspan and extracted text. The original `indexedPosition` is unchanged. `matched` means one structural match by section, complete code set and normalized title; it does not mean verified applicability or current law. `ambiguous` contains multiple physical rows without automatically combining them; `unmatched` is explicit. Every record has `legalVerification: not_verified`. Search exposes `sourceContextStatus`.

Coverage: 564 unique matches, 73 multiple-row matches, 150 unmatched. Of 283 positions originally marked `textNeedsContext`, 141 have a unique archived match. This does not add calculation rules or change thresholds. Production computations still use the same nine prepared branches.

Reproduce from the existing HTML 0.8 source archive (no implicit network fetch):

```sh
python3 -m pip install -r tools/requirements-context.txt
python3 tools/audit-table-context.py /path/to/kontur-2026-10-14.html --output table-context.json
python3 tools/test-table-context.py
npm test
```

The archive is a secondary consolidated publication dated 29 September 2026. Neither its title nor the snapshot date establishes legal currency. Next verification must check effective dates, amendments, footnotes and applicability against authoritative publications. In particular, the separate cost-limit continuation in section XIII must not be assigned to the GCV row merely because it is adjacent.
