# Step 8.3 and TPP 52 module foundation

Review date: 15 October 2026. Design matrix P01-P54 approved by the user on that date. Approval of the design is separate from legal verification and production release.

## Completed

- Three formula images from the Garant reproduction of act 1254 were downloaded and visually read. Source URLs, hashes and candidate transcription are in source-review-2026-10-15.json. This resolves the missing-image transcription issue, but not official full-text verification or the complete context of footnote 12.
- The date conflict for act 1297 was checked against another source. PPT reports 16 October, as does Alta; Garant reports 17 October. The interpretation excluding publication day supports 17 October, but approvedEffectiveDate stays null. The conflict is not resolved by majority voting.
- The approved, general P01-P54 matrix was converted into tpp52-checks.draft.json. It contains no client case, prices, contacts or client documents. All checks remain not_verified and normativeExecutionEnabled is false.
- tpp52-dossier.cjs implements a pure project workflow: immutable document versions, evidence references, remarks, receipt, review, reopening, recorded external decisions and replayable event history. It does not infer statutory applicability, origin, production, a deadline, a calculation or official approval.
- The import-validator adapter accepts legacy records without the optional field and checks the optional dossier both in assessments and historical snapshots. It is tested but not installed in the published application.

## Original HTML audit

Reviewed source files: app.js, engine.js and scenarios.js in the supplied localization-prototype-v0.8 archive.

| Area | Actual source behaviour | Integration consequence |
| --- | --- | --- |
| Local storage | app.js uses localization-prototype-v2; export formatVersion is 2 | Keep existing data and storage key during a compatible extension; do not overwrite projects with an empty new store |
| Assessment normalization | engine.js normalize adds missing defaults and retains additional fields | An optional tpp52 field can survive normalization; it still needs its own validation |
| Existing import | engine.js validateImport accepts the base schema but does not validate tpp52 | Install the additional validator before reads/imports, including historical snapshot inputs |
| Import of an existing assessment id | app.js importData only adds ids missing locally | Importing an updated dossier with an already present assessment id silently skips it; a conflict-aware import preview is required before enabling the UI |
| Current history | Calculation/scenario snapshots exist | They are different from a history of document versions and TPP remarks |
| Documents | Criterion-level documentPresent and free-text references | Receipt, content review and external acceptance must become different records |
| Same document used by several variants | No explicit versioned coverage relation | Dossier references include affected variants; resolving one cannot silently cover all |

The source archive is an audit input. It has not been modified. No new Site or independent app is created. The shared dossier implementation belongs to this existing repository; eventual HTML integration must use it rather than create another workflow copy.

## Scope and safety

The dossier holds document metadata, SHA-256 identifiers and event references. It does not upload files, request an MCP call, send a message or infer the truth of a recorded external decision. A recorded decision requires a source reference and document versions; it remains historical when those versions change.

Client dossier contents belong in the authorised private project environment. Only synthetic fixtures are included here. No dossier route has been added to the public server and the five-tool MCP contract is unchanged. No route-selection or numeric normative algorithm is implemented by this foundation.

## Validation

Run `npm run test:tpp52` for the dossier tests and matrix gate; `npm run test:audit` for amendment/parser checks; `npm test` for the existing engine/index/context regression suite.

Dossier scenarios cover old JSON, immutable snapshots, receipt without closure, required evidence, current document versions, multi-variant coverage, independent remarks, idempotent events, conflicting ids, separate external decisions, tampered JSON/history, malformed dates, unsupported events, empty-dossier readiness and the unverified normative package gate.

Passing these tests does not mean the GCV end-to-end acceptance suite has passed. UI integration and actual client evidence review remain outstanding.

## Remaining work

1. Obtain and verify official full texts for 1254, 1257, 1297 and the current TPP 52/64 package. Existing official page/PDF requests return inaccessible/502 responses. Do not relabel a secondary copy as official.
2. Resolve the legal effective-date conflict for 1297 and accept the complete formula context before integrating numerical changes.
3. Implement conflict-aware import for updates to an existing project; preserve the locally stored version and imported variant until reviewed. Do not silently choose one or lose events.
4. Connect the shared dossier and validator to the existing HTML project UI; add the document/remark views and safe export/import. The current public Site is the MCP interface, not a replacement for this application.
5. Implement and legally verify the approved conditional checks and confirmation routes. Keep unsupported branches explicit.
6. Run the full GCV acceptance plan with synthetic data, then authorised private evidence. Release production only after a separate user decision.

## Sources

- Act 1254, reproduced text and formula images: https://www.garant.ru/products/ipo/prime/doc/414893576/
- Act 1254 official PDF endpoint attempted: https://publication.pravo.gov.ru/file/pdf?eoNumber=0001202609300041
- Act 1297 official PDF endpoint attempted: https://publication.pravo.gov.ru/file/pdf?eoNumber=0001202610060054
- Act 1297 date, Garant: https://base.garant.ru/415025312/
- Act 1297 date, PPT: https://pravo.ppt.ru/postanovlenie/pravitelstvo/n-1297-356815
- Act 1297 date, Alta: https://www.alta.ru/tamdoc/26ps1297/
