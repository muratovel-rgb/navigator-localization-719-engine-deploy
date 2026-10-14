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

Treat the tool result as the Navigator 0.7 deterministic calculation result, not as an official legal determination of Russian origin.

If the tool result conflicts with the legal text or the skill's verified rule context, stop and report a candidate engine defect; do not silently overwrite either result.
