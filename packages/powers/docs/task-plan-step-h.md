---
type: Task Plan
title: 'Vida Powers — task-level plan for Step H: bounded engineering/UX guidance and typed reference resources'
description: 'Phased, evidence-gated implementation of the owner-accepted D14 and D15 scope.'
status: draft
stale_after: '2026-11-22T00:00:00Z'
tags:
- vida-powers
- task-plan
- d14
- d15
- engineering
- ux
- typed-resources
sources:
- id: d14
  resource: /decisions/D14-bounded-engineering-ux-guidance.md
  title: D14 — Bounded engineering and UX guidance
- id: d15
  resource: /decisions/D15-selected-typed-reference-resources.md
  title: D15 — Selected typed reference resources
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers acceptance criteria
- id: catalog-design
  resource: /catalog-design.md
  title: Vida Powers catalog design
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers product research
- id: traceability
  resource: /traceability.md
  title: Vida Powers traceability matrix
- id: implementation-plan
  resource: /implementation-plan.md
  title: Vida Powers implementation plan
- id: step-c
  resource: /task-plan-step-c.md
  title: Step C closed plan and dated applicability-refusal boundary
- id: research-amendment
  resource: /../.tmp/panel/csv-framework-joint-research-c120-20261022/DECISION-r2.md
  title: Corrected D-a/D-b research amendment
- id: independent-review
  resource: /../.tmp/panel/csv-framework-decision-validate-m31-r2-20261022-64/REVIEW.md
  title: Independent M3.1 R2 review of the amendment
generated: { by: codex/gpt-6-luna, at: '2026-10-22T13:17:32Z' }
revision: '5'
---

# Goal and boundaries

Implement D14 and D15 in separate, reviewable phases after the current core closeout. Preserve the general methodology and existing catalog/activation path. The accepted product scope is bounded engineering/UX guidance and selected typed reference records; it does not authorize a donor, source content, rights, a schema write, or Runtime acceptance.

This task plan is derived execution state. Business authority is D14/D15 and BR-22; system behavior is SR-81 to SR-87; acceptance is AC-47 to AC-55 plus the current/future distinction in AC-10/11. The relevant implementation is in the existing packages/powers catalog and skills.

No feature implementation occurs in the documentation reconciliation that created this plan. The parent owns Git operations and later assigns implementation tasks. Each phase receives its own hash-bound M3.1 review, bounded implementation work, focused verification, independent implementation review, and closeout receipt.

## Phases and dependency order

| Phase | Outcome | Requires | Exit |
|---|---|---|---|
| H0 | Current E4/core baseline and this plan are independently reviewed and frozen | Worker work is terminal; parent completes the frozen gates | Hash-bound green receipts and independent plan review; otherwise stop before H1 |
| H1 | Rights-cleared Wondelai general-method subset classified through the existing Markdown pipeline | H0; separate owner admission and rights evidence for each included source | Full carrier cover, 100% disposition, fidelity and duplicate review |
| H2 | Bounded engineering/UX instructions, structured applicability, and normative CSV intake contract | H1; separate source admission and rights review; H2 plan/contract review | Versioned schemas, complete row/cell map, applicability and refusal evidence |
| H3 | Selected typed JSON reference records retrieved by exact ID through the same catalog | H2; rights review for each resource family; H3 contract review | Schema, map, bounded reader, budget and negative-case evidence |

H3 cannot run in parallel with H2. No phase inherits a PASS from E4 or another phase.

## H0 — baseline and plan closeout

- **Owner:** repository owner for frozen checks; independent M3.1 reviewer for the plan.
- **Files:** this plan, current canonical B/S/AC/design docs, and frozen E4 catalog/schema inputs.
- **Estimate:** S.

1. Bind the current plan and canonical B/S/AC/design hashes. See the plan-review record below for the `.68` verdict and the `.69`/ `.71` finding dispositions.
2. The parent-owned `.67` frozen gate receipt is terminal at `.tmp/panel/frozen-final-gates-luna-max-r2-20261022-67/receipt-summary.json`. It reports PASS for package tests, typecheck, Knip, corpus and audits, donor validation, OKF, and changed-Markdown checks. The independent `.70` M3.1 review at `.tmp/panel/frozen-final-gates-validate-m31-r1-20261022-70/REVIEW.md` marks the `.67` packet READY as an evidence baseline (0 Critical, 0 Important, 2 Minor receipt-wording findings); numeric gates and Source binding are valid. `.67` still records `overall: NOT_CLOSED` and `packagePass: false`; this review does not close H0, Step H, package/product/release, or Runtime acceptance. Coverage exited 0 with functions 467/467 and lines 3,874/3,874; Bun emitted no statement counter, so no separate 100% statement-coverage claim is made; branches 0/0 are uninstrumented. `.70` M1 clarifies 2,617 package files plus one fixture-only input, not 2,618 package files. Exact counts and outputs remain in WORK and immutable `.67` receipts.
3. Reconcile the independent M3.1 `.65` review at `.tmp/panel/final-gate-repair-validate-m31-20261022-65/REVIEW.md` (21,927 bytes, SHA-256 `0797f85116ba9a7a37daeff6d80611add144691f8899e634bd300af23b7cc658`) with its exact candidate hash. It marks the `.62` repair CODE+EVIDENCE READY with no code blocker. It is not a package PASS or E5b approval. The `.66` preflight and check summary searched under `packages/powers/.tmp` and preserved false absence results; task `.69` records the correct repository-root path without changing those receipts.
4. Record the baseline catalog/schema/test hashes and the state of current ACs. The existing E4 contract remains the four current decision refusal reasons and the current 20-instruction/64,000-byte instruction-content limit.

**H0 gate:** all required current gates have terminal, hash-bound results; any failure is named and resolved or explicitly kept as a blocker; the independent plan review has no unresolved material objection. A missing review, unknown effect, or failed current gate blocks H1. H0 does not grant source admission or implementation authority.

**Plan-review record:** The independent M3.1 review at `.tmp/panel/accepted-scope-step-h-review-m31-r1-20261022-68/REVIEW.md` (26,835 bytes, SHA-256 `da9decc01fa3cea51c3c0539fab788db750add9ae7ab3c0bfa72ace7ab96fea8`) marked the pre-correction Step H plan READY. It found two Important and six Minor findings. Task `.69` corrected both Important and the five accepted Minor findings; M6's root README spelling change was rejected under the owner's explicit `VidaPowers` brand instruction. The `.68` verdict covers its reviewed plan bytes, not the later documents or H0 closure. Review `.71` found no B/S or phase-order regression and raised N1-N4; this `.73` packet records their dispositions.

**Current H0 status:** Review `.70` marks the `.67` numeric evidence baseline READY; `.67` still records `overall: NOT_CLOSED` and `packagePass: false`. The `.72` fixture receipt at `.tmp/panel/native-fixture-refresh-luna-max-20261022-72/receipt-summary.json` records 5,239 outputs, 2,617 package files plus one fixture-only input (2,618 common mirror files), 17 writes on build 1, 0 on build 2, a passing read-only check and 0 CAS issues. Its Source freeze was 2,628 files at SHA-256 `5b21618b7987e5efa8153dd6703a1a4d9d1b156a749d59e6f595d4d15c798d31`; it covers the `.69` documentation, not these `.73` bytes. H0 remains open until the parent closes the current hash-bound gates and reconciles their evidence. No source admission, feature implementation or Runtime acceptance follows.

## H1 — Wondelai general-method subset

- **Owner:** one content integrator with independent source/fidelity reviewer; repository owner decides admission.
- **Canonical donor carrier:** plugins/wondelai-skills/skills/ at the pinned revision recorded in donors.yaml.
- **Current inventory evidence:** 421 Markdown files in plugins/wondelai-skills; all 14 guided-journey directories are inside the declared carrier; their specified copies under plugins/metaskills/skills must be byte-identical. The 30 journey Markdown files are all inside the carrier and excluded, leaving 391 candidate Markdown files. The 391 count is candidate files, not norms or instructions.

1. Before writing a corpus record, obtain evidence of rights for the exact proposed text and owner admission for the source subset. The existing MIT license does not clear book-derived or embedded third-party material. If any item lacks clearance, reject it with a reason and do not convert it.
2. Recheck the pinned source, exact carrier, all 14 journey-directory locations, 30-file exclusion, zero journey files outside the carrier, and byte-identical mirror receipt. Keep unrelated repository/root copies outside the carrier set.
3. Inventory and disposition every carrier file. Select general methods only; exclude orchestration state, book-derived passages without clearance, framework/version recipes, assets, and unrelated content. Reuse existing converter, catalog and processing-map behavior. Preserve the donor's original language and current fidelity rules.
4. Deduplicate against the existing corpus. Preserve all source locators for a true merge; do not merge merely similar ideas. Reuse existing tag vocabulary where it fits; propose only genuinely new tags under the existing tag policy. Record every rejection in the map.
5. Run a pilot of 10 candidate files with complete independent fidelity review. Record source units attempted, accepted, rejected, merged, review defects and elapsed time. Re-estimate each next batch from observed throughput; use batches no larger than 25 files until a separate review authorizes a different size. Any rights or semantic-fidelity defect pauses expansion.

**H1 acceptance:** all 421 Markdown carrier paths are accounted for; the 30 journey files are explicitly excluded; the 391 candidates each have a disposition; all 14 journey directories are within the carrier and specified mirrors are byte-identical; no unreviewed or uncleared content is admitted; corpus, map and digests agree; duplicate and fidelity reviews have receipts. H1 does not authorize H2 CSV sources.

## H2 — engineering/UX instructions and applicability

- **Owner:** one catalog/schema implementer, one content integrator, one independent applicability/fidelity reviewer; repository owner controls source admission.
- **Estimate:** L, recalculated after the H1 pilot.
**Scope:** only bounded engineering/UX norms for named frameworks, runtimes, platforms, accessibility needs and targeted standards. The measured 1,434 UUPM normative CSV rows are source rows, not a required inclusion count. Select only individually reviewed, rights-cleared rows. Business and marketing material, broad asset sets and unresearched domains remain out of scope.

1. Bind every intake file to a pinned, allowlisted donor path and rights record before parsing. Preserve the raw file and raw-file digest as source evidence. A donor-wide license is not assumed to clear embedded assets or copied book text.
2. Define source-column roles before selecting rows: normative text (title, description, direction, exception, example) versus source metadata (applicability, severity, status, version labels). Preserve original labels such as Platform, Applies To, High and Active. Do not translate or silently normalize source meaning.
3. Parse CSV only in development tooling. Require strict UTF-8; accept quoted commas and quoted newlines; reject empty or duplicate headers. Formula-like and command-like values stay inert. Shipped code reads only JSON and Markdown.
4. Extend the processing map with explicit CSV path allowlist, raw-file hash, stable row identity, normalized-row hash, per-cell hashes, row/cell locators, disposition, and links to every resulting instruction/resource ID. Use entityId plus sourceKey where present; otherwise use canonical path plus the digest of ordered parsed headers and cell values. Row reorder keeps identity stable; a cell edit changes its digest; line number is a display locator only. Identical duplicate rows merge with all locators retained or are rejected with a reason.
5. Bind every generated instruction to its exact source cells. Human fidelity review checks meaning, original language, strictness, negation, units, applicability, severity and exceptions. Token matches elsewhere in a file do not count as proof. Do not translate, strengthen or weaken a rule; review concrete examples such as the UUPM motion heuristic with its adjacent warning.
6. Model applicability separately from methodology groups and compatibility conflicts. Store normalized framework/package identity, declared version range, runtime, target platform, standard identifier, standard version and conformance level where relevant, while preserving the source label. Define and test the source-version parser before admitting ranges. Distinguish applicable, inapplicable and unresolved; unknown, conflicting, missing-required or unparsed context never picks the newest-looking rule.
7. Preserve current v1 refusal codes unchanged: no-candidates, unknown-candidate, candidate-not-allowed, invalid-format. Add applicability-unresolved as the fifth code only with the future applicability implementation; materialize unresolved context under SR-20/AC-11. It is not a current E4 behavior.
8. Version the contract before schema edits: add VPInstruction/v2 applicability fields and VPCorpusMap/v2 row/cell coverage while retaining v1 fixtures and behavior. The validator enumerates Markdown carriers plus the exact CSV allowlist, rejects missing and unknown map entries, verifies every CSV row and every materialized ID, and fails closed on unsupported input.
9. Keep applicability in catalog.search/compose. Matching and policy remain in the existing catalog; do not add a sixth methodology profile group, rewrite compatibility_requires/excludes, encode framework versions as tags, add BM25/Python, or create another activation path.

**H2 acceptance:** every admitted file and row is pinned and cleared; 100% source-unit coverage and cell locators; reordering and cell-edit identity tests; semantic-fidelity receipts; version parser fixtures for inclusive/exclusive and malformed labels; positive, negative, unknown, conflicting and missing-context applicability cases; explicit fifth refusal with materialization; current four refusal codes unchanged; v1 fixture compatibility; exact test/corpus/coverage/typecheck/Knip/portable-runtime and documentation receipts. No row count or estimated ID total is reported as delivered content.

## H3 — selected typed reference resources

- **Owner:** one resource-schema/catalog implementer, one source integrator, one independent rights and payload-boundary reviewer; repository owner controls each family admission.
- **Estimate:** M, recalculated after H2.
- **Allowed record types:** palette, font-pairing, style, icon-list and standards-checklist. Each family has its own rights and promotion review; a donor repository license does not automatically clear fonts, icons or embedded assets.

1. Materialize selected records as canonical JSON at resources/<resource-id>.json under VPReferenceResource/v1. Each record has a stable ID, type, revision, applicability where relevant, source provenance, exact row/cell locators, payload and digest. Use namespaced stable IDs; never identify a record by position in a CSV.
2. Version the single catalog manifest to VPCatalog/v2 with explicit instruction and resource entries; preserve VPCatalog/v1 fixtures and reject silent reinterpretation. Update its schema and the processing map version before data conversion. Define deterministic UTF-8 canonical serialization and calculate the record digest over the record with the digest field omitted. Keep raw-file hash, row hash and resource digest distinct.
3. Add catalog.resource.get(resource_id) as exact-ID retrieval in the existing portable catalog CLI. Unknown, disabled, malformed, wrong-type or mismatched-digest IDs return explicit errors. For a composed session bundle, accept explicit resource_ids only after instruction/applicability selection; absent IDs retrieve no resource. A diagnostic exact-ID get is not a qualified composed bundle.
4. Keep canonical containment and symlink checks in one shared helper under skills/vp-mode/scripts/. The shipped reader and catalog import it; scripts/formation-payload.ts imports the same owner from skills/vp-mode/scripts/ so development formation cannot weaken or fork the safety rule. Do not make runtime code depend on scripts/.
5. Check canonical path containment, reject symlink traversal, verify digest/schema/type/encoding/size, and mark resource text as untrusted. Never read the entire CSV or inject all assets. Retrieve only explicitly selected resources.
6. Count selected instruction content plus selected resource payloads serialized as canonical UTF-8 JSON under the existing 64,000-byte cap. The limit of 20 still counts instructions only. Exclude metadata, the outer envelope and execution context. Overflow fails the entire composition without truncation, partial output, or an artifact-reference bypass.
7. Review one resource family at a time. Start with a pilot of 25 records from one admitted family; inspect every record for type, rights, IDs, provenance and digest. Record actual accepted/rejected counts, elapsed time and review defects before sizing the next batch. Any family-specific rights or fidelity defect blocks that family.

**H3 acceptance:** every admitted resource has one valid typed record, exact source locators, rights evidence and digest; the catalog manifest and map agree; exact-ID positive/negative and type mismatch tests pass; path traversal, symlink, malformed JSON, hash mismatch, unsupported encoding, type confusion and length overflow are rejected; no automatic resource inclusion occurs; mixed-bundle byte tests prove the shared cap and all-or-nothing overflow; v1 catalog fixtures remain valid; no second catalog, activation, store, BM25 or Python runtime is added.

## Shared implementation file allowlist and ownership

The later implementation tasks may touch only the product-owned surfaces named below, after phase-specific approval and a hash-bound review. The executing owner checks the current tracked implementation before fixing any filename.

| Surface | Phase | Owner and boundary |
|---|---|---|
| docs/task-plan-step-h.md and the canonical docs linked above | H0 | Product owner; maintain one B/S authority |
| donors.yaml, NOTICE, selected instruction files, catalog.json, corpus-map.json | H1/H2/H3 | Source integrator; only after separate source admission and rights evidence |
| config/vpinstruction.v2.schema.json, config/vpcorpusmap.v2.schema.json, config/vpcatalog.v2.schema.json, config/vpreference-resource.v1.schema.json | H2/H3 | Catalog/schema owner; explicit versions and migration fixtures |
| scripts/convert.ts, scripts/check-corpus.ts, scripts/audit.ts, scripts/audit-report.ts | H1/H2/H3 | Development tooling; CSV parser is development-only |
| skills/vp-mode/scripts/catalog.ts and skills/vp-mode/scripts/resource-paths.ts | H2/H3 | Shipped portable reader and one path-safety owner |
| scripts/formation-payload.ts | H3 | Development formation imports the shared path-safety owner; no runtime import from scripts/ |
| tests/, tests/fixtures/ and resources/ | H1/H2/H3 | Focused regression, negative, migration and payload fixtures |
| packages/agent, root manifests/config, user data and marketplace outputs | none | Outside Step H; require separate authority and work item |

## Verification and rollback

Each phase binds receipts to the exact source, schema, code, fixture and map hashes used. Run focused phase tests first, then all required package gates: Bun test and 100% coverage, typecheck, package Knip entry checks, corpus/map/fidelity audit, OKF and explicit-file documentation validation. Run the shipped subset under Bun, Node and Deno; report an unavailable runtime as a gap. Use negative tests for malformed CSV, duplicate/empty headers, formula-like cells, missing/extra map rows, reordered rows, edited cells, unknown applicability, stale schemas, wrong resource IDs/types, path traversal/symlinks, digest mismatch, oversized data and partial-bundle prevention.

An independent implementation review is separate from the plan review and runs after each phase candidate is frozen. Do not report a phase complete when its review, acceptance, source/right proof, or required gate is missing. If a generated corpus or resource fails review, restore only the phase-owned outputs from its recorded source snapshot, keep the existing eight-donor corpus and E4 behavior intact, and preserve the failed receipt. Never retry a possibly completed write without terminal evidence.

## Limits and estimates

The independent M3.1 R2 review §4/F4 links the earlier .61 F8 estimate finding to the corrected research amendment and its estimate table. It attributes estimates of 10–40 UUPM rows merging with existing instructions, 3–6 cross-donor clusters, and 1,300–1,700 new instruction IDs. The source universe is 1,434 CSV rows plus 391 candidate Markdown files: 1,825 different source units, not 1,825 rows or instructions. The 3,810–4,210 total and 52–68% growth are arithmetic planning estimates only. The listed reference categories total 4,331, while the older 4,523 figure exceeds them by 192 and is not verified. The estimate provides no legal clearance, selection, conversion count, or throughput promise. Each phase re-estimates only from measured pilot batches.

## Definition of done

1. H0 has terminal, hash-bound current gates and an independent plan-review receipt with no material objection.
2. H1 accepts only rights-cleared and owner-admitted general methods, with the full 421-file cover, 30 journey-file exclusion, 391 candidate dispositions, mirror verification and human fidelity review.
3. H2 passes versioned applicability, CSV row/cell coverage and fidelity, preserves the current four refusal codes, and proves the future fifth reason without mislabeling it as current E4.
4. H3 retrieves only requested typed resource IDs from the same catalog, passes provenance, rights, safety and shared-budget checks, and keeps all v1 fixtures valid.
5. Every phase has independent implementation review, actual verification receipts, updated B/S/AC traceability, and a dated log entry. No donor, implementation, or Runtime-acceptance claim exceeds its evidence.
