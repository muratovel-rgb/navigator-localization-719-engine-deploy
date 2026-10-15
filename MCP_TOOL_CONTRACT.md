# MCP tool contract for the ChatGPT plugin

## engine_health
Use before first calculation in a conversation when engine availability/version matters.

## search_localization_rules
Use only after the skill has narrowed the product by OKPD2/name/characteristics. Results are prepared calculation branches, not the complete legal index.

Never infer that absence from this tool means PP No. 719 does not apply.

## get_localization_rule
Call before collecting calculation facts. Use returned criterion IDs and requirements; do not invent criterion IDs.

## get_threshold_context
Call whenever the user asks how many points/what threshold is required for a date and purpose.

Do not infer a universal registry/localization threshold when the tool returns null.

## calculate_localization
Call only when:
1. a concrete prepared rule branch is selected;
2. legal applicability has been verified or explicitly marked as provisional;
3. `classificationConfirmed=true` only when the selected PP No. 719 position is actually confirmed;
4. facts are mapped to criterion IDs returned by `get_localization_rule`.

Treat the tool result as the Navigator 0.8 deterministic calculation result, not as an official legal determination of Russian origin.

If the tool result conflicts with the legal text or the skill's verified rule context, stop and report a candidate engine defect; do not silently overwrite either result.


## Additive response fields in service 0.3.0

- health: `calculationRules` and `unresolvedRules`; legacy `rules` remains all entries.
- rule: `foreignLimit`, `thresholdPolicy`, `periods`.
- criteria: `manufactureOrUse`, `originRequired`, `originTerritories`, `creditGroup`.

For an alternative criterion choose `route=manufacture` with Russian production facts, or `route=use` with `origin=rf` and an explicit `originBasis` where the rule permits only RF. EAEU residence or supplier country does not establish RF origin. Do not count the alternative twice. Purchasing or outsourcing does not remove an applicable operation from the maximum.

`applicableCriterionIds` is the complete set of included scored criteria. IDs must be unique scored criteria from this rule. This tool validates the set, not the technological evidence for exclusions. A numeric threshold uses that rule/date/goal. `null` is preserved for unassigned thresholds, including 2026 procurement contexts in the supplied measurement rules.

Tool names and calculation fact input keys remain unchanged. LNG selection and BOM transport remain unsupported and must not be guessed. Unresolved rules remain blocked.

## Full-index search in 0.4.0
Search results include indexed positions in addition to prepared calculations. Choose by code, purpose and characteristics. Use limit/offset and nextOffset to read all candidates. Use resultType and calculationAvailable; never treat every indexed ID as an implemented calculation. get_localization_rule accepts a prepared ID or indexed position ID and returns the exact indexedPosition text and provenance. A search miss does not establish absence in PP719. fullLegalCoverageVerified is false for this imported baseline.
