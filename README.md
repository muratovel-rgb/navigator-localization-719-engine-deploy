# Navigator Localization 719 MCP v0.2.2 public deploy

Deterministic calculation service extracted from `localization-prototype-v0.7.html`.

## Tools

- `engine_health` — engine/release version and prepared rules.
- `search_localization_rules` — search the **prepared calculation branches**, not the full 787-row legal index.
- `get_localization_rule` — retrieve the selected rule and criterion IDs.
- `get_threshold_context` — resolve threshold purpose/date without inventing a universal threshold.
- `calculate_localization` — execute the Navigator HTML 0.7 calculation engine.

## Architectural boundary

The ChatGPT skill remains responsible for legal applicability, current-source verification, GAP analysis and localization planning. This service performs deterministic calculations only for branches already implemented in HTML 0.7.

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
