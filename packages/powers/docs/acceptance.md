---
type: Acceptance Criteria
title: Vida Powers — acceptance criteria
description: 'Verifiable acceptance conditions for the behavior of Vida Powers with a binding to the system specification and the kind of evidence.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- acceptance-criteria
- verification
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
generated: { by: codex/gpt-6.1-sol, at: '2026-10-26T15:36:09Z' }
revision: '17'
---

Each criterion: **ID**, condition, **binding to an SR**, **evidence**, **type**, **state**.
Types: `auto` — executed by a command; `manual` — requires observation by a human or
an attached agent; `mixed` — executed checks together with source/agent review;
`external` — evidence outside VP (host qualification, marketplace,
runtime acceptance).

**States:** `open` — not verified; `verified` — evidence exists; `gap` — evidence is impossible in
the current scope (recorded as a GAP, not as passed).

## Instruction and catalog

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-01 | The validator rejects an instruction without mandatory fields, with an `instruction_id` that does not match the file name, with an incorrect `revision`, with an unknown tag in the vocabulary, with an unknown id in `compatibility_requires`/`_excludes`, with an empty or incorrect `provenance` list (source not in `donors.yaml`, license does not match, `revision` not equal to `head_sha`, the same source twice) | SR-01, SR-05, SR-06, SR-07 | catalog validation test | auto | open |
| AC-02 | A tag that is not kebab-case or has one component is rejected; `tdd` is recognized as the alias `test-first-development` | SR-03 | tag rules test | auto | open |
| AC-03 | An active instruction without a capability or pattern tag is rejected unless there is an explicit exception with a reason | SR-04 | exceptions test | auto | open |
| AC-04 | A tag missing from the vocabulary makes the catalog invalid | SR-05 | vocabulary test | auto | open |
| AC-05 | `catalog.search` returns no `content` field (checked on all instructions of the selection) | SR-10 | search test | auto | open |
| AC-06 | `catalog.get` on an unknown ID returns an error, not an empty result | SR-11 | error test | auto | open |
| AC-07 | `catalog.compose` includes mandatory instructions and transitive dependencies even when they do not match the tags | SR-12, SR-13 | composition test | auto | open |
| AC-08 | `catalog.compose` on a mutually exclusive pair returns an error with both identifiers | SR-14 | conflict test | auto | open |
| AC-09 | The catalog manifest (`catalog.json`) is read by the standard `JSON.parse` without dependencies; instructions are read by the frontmatter parser from a YAML subset | SR-15, SR-62 | parsing test | auto | open |

## Decision Provider and routing

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-10 | Current v1 `decision.evaluate` has exactly four refusal triggers: no candidates → no-candidates, unknown candidate ID → unknown-candidate, candidate outside the admissible set → candidate-not-allowed, malformed format → invalid-format; each preserves scope, policy and validation. applicability-unresolved is introduced only with SR-82 and is not current E4 behavior | SR-16, SR-18, SR-82 | Current refusal table; future applicability refusal fixture | auto | open |
| AC-11 | The decision result contains the source, selected IDs and non-empty refusal reason. After SR-82 is implemented, applicability-unresolved also materializes the unresolved context and reason | SR-20, SR-82 | Decision materialization test; future unresolved-context test | auto | open |
| AC-12 | The threshold is applied only to a calibrated operation; an uncalibrated operation returns the uncalibrated marker; v1 has no semantic scoring — it is performed by the skill | SR-21, D5 | calibration test | auto | open |
| AC-13 | Routing returns the selected LLM, the formed agents from the bundle (role, task contract, methodology, scope, materialization requirements, artifacts) and the flow level | SR-22, SR-23 | `vp-mode/SKILL.md` + `.38` Bun/Node compose smoke; final integrated evidence pending | auto | open |
| AC-14 | Routing creates no execution graph of its own: the result contains no stage plan of its own | SR-24 | `tests/skill-contract.test.ts`; final integrated evidence pending | auto | open |

## Methodology profile

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-15 | An inheritance conflict between two alternatives stops the choice and formulates a question to the owner; the "last one wins" rule is not applied; groups and alternatives come from the profile | SR-25, SR-28 | .38 tests cover canonical effective-profile validation/refresh, valid unresolved-choice negotiation with alternatives/no bundle, and stale profile refresh; Stage 4 inheritance and override resolution remain open | auto | open |
| AC-16 | A task-scoped override is recorded, passed to child agents and does not change the permanent profile, other products, permissions or security gates | SR-29 | override test | auto | open |
| AC-17 | The semantics of an instruction does not change under the same ID; a change of behavior requires a new pattern ID | SR-30 | identity test | auto | open |
| AC-18 | The `Light` level does not skip mandatory AC, materialization and mandatory gates | SR-31 | depth profile test | auto | open |
| AC-19 | The same profile section is read with the same semantics from the Runtime target `.vida/project.yaml` after cutover, the Standalone managed block, and the host-shim project config | SR-33 | Standalone/host-shim persistence has focused E4 evidence; the Agent currently reads `agent-runtime.config.v1.yaml` with no VP profile reader; `.vida/vp-profile.json` and `vida-project-profile.json` are bridge exports, not Runtime reads | auto | open |

## Materialization, findings, scope

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-20 | Every content operation leaves an artifact per `artifact_contract` or an explicitly recorded update of an existing one | SR-37, SR-38 | Human Work Items exist; artifact materialization and index proof remain open | auto | open |
| AC-21 | The presence/format/digest check and the semantic check are different operations; closing an AC requires both | SR-41 | No complete presence/format/digest plus semantic-check receipt; remains open | auto | open |
| AC-22 | A repeated delivery of the same message creates no new event in the findings register; a confirmed duplicate is linked to the canonical `finding_id` while preserving the new evidence | SR-45 | `.35` focused tests prove deterministic replay, separate same-fingerprint observations, and explicit evidence-bearing merge; semantic candidate generation/equivalence are unverified | auto | partial |
| AC-23 | A finding that goes beyond the Work Scope is recorded as a blocker with a permission request; the scope is not expanded | SR-53, SR-54 | `.35` test preserves caller-supplied blocker/request text; writer does not detect out-of-scope input or enforce permission policy | auto | open |
| AC-24 | Creating a finding does not authorize a fix | SR-43 | `.35/findings-green-final.txt`: `preserves an out-of-scope blocker and its permission request without authorizing a fix` passes | auto | verified (component) |

## Operational rules and formats

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-25 | A repeated `vp-setup` on unchanged input yields an empty diff; setup changes no file of the installed agent package | SR-56, SR-57 | idempotency test + read-only check | auto | open |
| AC-26 | Bootstrap does not load the whole corpus: the current E4 bundle contains at most 20 instructions and 64,000 UTF-8 bytes summed over selected `content` only after profile filtering, active-alternative replacement, and full required/transitive dependency closure; 1 KB is 1,000 bytes; the tag dictionary, JSON/envelope, instruction metadata, and execution context are excluded; overflow rejects the whole result. Future selected resource payload bytes share this cap under AC-55; the 20 limit still counts instructions only | SR-58, SR-87 | .38: 54 focused tests, Bun 1.4.3 and Node 24.16 setup/compose smoke checks, 2,510 payload hash matches, and 28-file typecheck; Deno unavailable; full Step E gates remain pending; AC-55 resource tests not run | auto | open |
| AC-27 | The absence of a host capability is marked as a limitation, not as a completed check | SR-59 | host matrix | manual | open |
| AC-28 | The same script shipped in the skills runs without a build under `node`, `bun` and `deno`; it contains no Bun-specific APIs | SR-63 | run under three runtimes + static check | auto | open |
| AC-29 | `compose` with an effective profile discards inactive group alternatives; without a profile, direct exclusions fail. Its canonical profile/schema cache revalidates changed bytes and refuses unreadable, malformed or contradictory replacements | SR-25, SR-26, SR-28, SR-14 | Compose cases with/without a profile, warmed-cache replacement failures, duplicate groups/alternatives and ambiguous dependency replacement | auto | open |
| AC-30 | Structural part: the corpus contains no two instructions with the same `instruction_id`, and an instruction with two sources has them in `provenance` | SR-07 | corpus validation test | auto | open |
| AC-30b | Semantic part: each norm is present in the corpus exactly once — duplicates merged, terms reduced to the vocabulary, a change of a merge raises `revision` | SR-07 | merge phase report (step D) + human review sampling | manual | open |
| AC-31 | The processing map `corpus-map.json` matches the `VPCorpusMap/v1` contract: statuses `converted`/`split`/`merged`/`rejected`, `rejected` always with a reason, `merged` leads to an existing instruction | SR-66 | map schema test | auto | open |

## Added by the round 3 validation

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-32 | The processing map is consistent with the corpus: each instruction has an entry, each entry points to an existing instruction, each `rejected` has a reason; a repeated run on the same donor revision does not change the map | SR-66 | map-to-corpus consistency test | auto | open |
| AC-33 | Within an active task an agreed snapshot of instructions applies; the next task may have a more current compatible revision; changed input invalidates only the bound evidence | SR-07, SR-67 | snapshot test | auto | open |
| AC-34 | A change of an instruction is classified by risk (low/medium/high) and has the corresponding acceptance type; a change of semantics requires a new pattern ID | SR-30, SR-68 | classification test + change review | auto | open |
| AC-35 | The product has a stable identifier independent of the path; under real methodological variability the user's choice is requested once and recorded | SR-69 | ID stability test + choice record | manual | open |
| AC-36 | `catalog.search` filters by role, product and application conditions, returning only metadata | SR-10, SR-70 | search test | auto | open |
| AC-37 | Executing a UI scenario by a UI agent is not human acceptance: without the required human answer the result remains `awaiting-human-verification`, not PASS | SR-71 | manual check + UAT record | manual | open |
| AC-38 | In Standalone the last entry is transparent (no lease and reservation), hidden overwriting of others' changes is forbidden, the Work Scope is not expanded | SR-53, SR-72 | manual check of the change log | manual | open |
| AC-39 | The derived full-text index is recoverable from the normative sources and does not duplicate them; a document outside `wiki_root` is indexed by reference | SR-73 | index test | auto | open |
| AC-40 | A nested subtask adds no external stages and does not bypass gates; a specialist request grants it no new authority | SR-74 | manual check of the delegation tree | manual | open |
| AC-41 | `vp-setup` preserves third-party instructions and the current source map; only the managed VP block is updated | SR-75 | setup test on a fixture with third-party content | auto | open |
| AC-42 | The catalog manifest is consistent with the disk: each file in `instructions/` is listed in `catalog.json` with a `sha256`; a file outside the manifest, an entry without a file and a mismatching digest are errors | SR-76 | manifest-to-corpus consistency test | auto | open |
| AC-43 | Every declared opposing pair is declared in both directions and carries one dedicated theme pattern tag, and the table of the D12 decision record lists every declared pair | SR-14 | audit report: `audit.ts pairs` and `audit.ts pair-agreement` (22 declared, 22 listed, findings: 0) | auto | open |
| AC-44 | An instruction that states a finding severity uses the canonical scale — Critical, Important, Minor — and keeps the criteria of each level; a risk scale, an effort scale and a status vocabulary keep the donor's own labels | SR-78 | vocabulary scan of the corpus + donor review | auto | open |
| AC-45 | Selected host manifests use supported skill field shapes (Codex `"./skills/"`; Claude/Cursor the two shipped skill paths), validate rooted `SKILL.md` resources before write/check, keep portable root discovery standard, and leave `catalog.json` as the sole corpus listing without copied payload or vendor field | SR-79; [E5 target status](task-plan-step-e.md#e5-target-status) | `.39` verified the Codex `skills` string and rooted regular `SKILL.md` resources. `.54` fixture build/check exited 0 over 5,233 scratch outputs; Muse/Antigravity 2,615-file path/byte/SHA maps match. Muse catalog is `MANIFEST_MUSE_CATALOG_NOT_READY`, marketplace output was withheld, and the default production check fails closed on absent input; no production output or host acceptance is proved | auto | verified (component) |
| AC-46 | Manifest writes change only matching ledger-owned files, reject foreign or modified targets before effects, prune only proven-owned stale files, and recover coherently from observed write failure; read-only check rejects invalid ledger, retained transaction state, and present outputs without matching ledger digests; missing, drifted and stale results remain distinct, and the byte set plus direct-directory membership do not change | SR-80 | `.46` GREEN: 28 pass / 0 fail / 202 assertions; Luna R4 `.49` independently marked bounded E5a code READY and I3 closed. `.54` fixture build/check exited 0, recorded zero additional writes/removals and an unchanged source inventory. `.60` full tests passed 411 with one Windows skip; typecheck passed 29 files; coverage exited 1 at 466/467 functions and 3,865/3,874 lines, and Knip exited 1 on one external-binary `attrib` issue. Full Step E gates, production inputs/outputs and host acceptance remain open | auto | verified (component) |

## Accepted phased content scope (D14, D15)

The criteria below are future gates. They do not change the current E4 acceptance record or prove implementation.

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-47 | The engineering/UX, product and business pack admits only individually reviewed, rights-cleared and owner-admitted subsets within D14; general methodology remains in the same catalog; journey exclusions persist and former domain exclusions are not automatically promoted | SR-81 | Exact per-source selection/disposition, fidelity, rights and owner-admission records | manual | open |
| AC-48 | Each framework-, platform-, accessibility-, or standards-dependent instruction has structured applicability facts and retains the source applicability label; unparsed version labels do not match | SR-82 | Schema validation and applicability fixtures | auto | open |
| AC-49 | Missing, unknown, malformed, or conflicting required applicability context produces no selected rule, returns applicability-unresolved, and records the unresolved context; the code is absent from current E4 behavior | SR-16, SR-20, SR-82 | Applicability refusal table and materialization test | auto | open |
| AC-50 | Each accepted CSV-derived instruction binds its meaning review to exact source rows and cells; identical duplicates retain every locator or are rejected with a reason | SR-84, SR-85 | Cell-level map and human semantic-fidelity review | manual | open |
| AC-51 | The development intake parser handles strict UTF-8, quoted commas and quoted newlines; empty and duplicate headers fail; formula-like cell text remains inert | SR-85 | Parser edge-case tests, including inert formula-like values | auto | open |
| AC-52 | A typed reference record has a stable exact ID, type, schema version, provenance and digest; the same catalog reader retrieves only the requested ID and errors on an unknown ID | SR-83 | Resource schema and exact-ID positive/negative tests | auto | open |
| AC-53 | The processing map covers every selected CSV row; row identity survives reorder, changes when a cell changes, keeps a separate raw-file digest, and never uses a line number | SR-84 | Map consistency and identity tests | auto | open |
| AC-54 | Resource reads reject traversal, symlinks, digest mismatch, invalid schema/type, unsupported encoding and excess size, and return only selected IDs as untrusted source data | SR-86 | Reader boundary and negative tests | auto | open |
| AC-55 | Resource content counts toward the shared 64,000-byte cap as canonical UTF-8 JSON; the 20 limit counts instructions only; overflow returns no partial result | SR-58, SR-87 | Mixed instruction/resource size-boundary tests | auto | open |

## Donor migration qualification

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-56 | Markdown capture rejects invalid UTF-8, retains BOM, handles CRLF/LF/CR and astral/combining codepoints with exact raw bytes and bounded line/codepoint/byte locators; changed source or capture policy invalidates capture | SR-88 | Source-packet positive, malformed-byte, locator-boundary and stale-binding fixtures | auto | open |
| AC-57 | Missing, stale or contradictory transitive evidence blocks eligibility; scoped reviews stay scoped; only Root reconciliation of attributable human fidelity, rights and admission produces an eligible exact subset | SR-81, SR-89 | Source-packet negative/reuse fixtures and attributable admission dossier; models and fixture approvals do not close the manual gate | manual | open |
| AC-58 | Prepared conversion preflights the entire batch and both directions of source/spec provenance before writes, stages reviewed bytes, preserves unrelated files and merge contribution locators, detects stale preimages and changed donor revisions, and classifies interrupted changed/no-op/absent targets without automatic retry; existing callers retain sequential results | SR-90 | Converter fixtures for conflict, missing source contribution, retained merged/split locators, interruption after each target, all-old/all-intended/mixed/unexpected states, readback and legacy compatibility | auto | open |
| AC-59 | Comparable pre-treatment and treatment receipts account for ten distinct admitted source files, quality, failures, rework and elapsed time before scaling or claiming donor speedup | SR-91 | Bound baseline, qualified pilot and matched treatment receipts; component-only fixture timing is insufficient | manual | open |

## Instruction organization (D16)

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-60 | Exact v1.2 dispatch rejects legacy and unknown markers, unsupported labels and illegal classified/unclassified states | SR-06, SR-92 | Schema/parser/reader boundary and round-trip fixtures; explicit legacy rejection results | auto | open |
| AC-61 | Optional facet filters obey OR/AND rules; no-facet results/metadata order stay unchanged; active unclassified inclusion and disabled/digest/dependency/profile/compose-limit rules are preserved | SR-10, SR-58, SR-70, SR-92 | Public catalog/CLI/compose positive, negative, no-facet and limit checks | auto | open |
| AC-62 | Browse derives deterministic groups/counts from one verified listing; multi-domain membership does not duplicate canonical IDs; strict final checking accounts for every frozen rollout ID with evidence or an unclassified reason | SR-76, SR-92 | Browse fixtures, exact cohort manifest, classification evidence and strict corpus/invariant receipt | auto | open |
| AC-63 | Metadata batches use converter-owned prepared publication over existing IDs only, preserve body/provenance/map invariants and exact donor eligibility guards, and fence stale, partial or unknown writes | SR-90, SR-92 | Prepared converter ownership/CAS/review-binding/no-op/interruption/reconcile fixtures and per-batch readback receipts | auto | open |
| AC-64 | Frozen baseline/prototype/40-item treatment retain query/label/judgment bindings and matched outputs, errors and timing scope; semantic metrics and uncertainty are reported under the frozen protocol without claims of human, full-corpus, NL-search or donor-throughput acceptance | SR-92 | Bound old-code baseline, same-input structure prototype, isolated treatment and model-evaluation reports, exact code review and unchanged package gates | auto | open |

These criteria do not close AC-57/AC-59, legal clearance or Runtime acceptance.

## Compact retrieval workflow

| ID | Criterion | System trace | Evidence | Kind | State |
|---|---|---|---|---|---|
| AC-65 | One multi-value query/filter flag works; tag and candidate identities are unique before pagination; ordinary lists contain only ID and description; help matches grammar and explicit source selection | BR-24, SR-10, SR-70, SR-92, SR-93 | CLI positive/negative/alias/duplicate/pagination/source-snapshot fixtures and exact stdout checks | auto | open |
| AC-66 | One multi-ID get uses compose, includes each required/dependency rule once, preserves body/applicability/output obligations, enforces limits and emits no partial text on any failure | SR-11, SR-12, SR-13, SR-58, SR-93 | Public process tests with duplicate IDs, bad later ID, dependencies, source/digest/schema/status errors and exact text/limit checks | auto | open |
| AC-67 | Current resolved profiles, stale alternatives, unresolved choices and declared exclusions take their existing distinct paths; opposite IDs are not deduplicated or chosen by rank, and shared themes do not falsely exclude complementary rules | SR-14, SR-25, SR-26, SR-93, D12 | Profile/closure/conflicting-pair and same-theme-complementary fixtures, including atomic empty stdout | auto | open |
| AC-68 | vp-mode explains evidence-based task-to-tag routing and uncertainty; PR handling does not infer write authority; maintained skill/help/README examples execute the implemented compact workflow | BR-24, SR-22, SR-25, SR-93 | Routing examples for code/documentation/ambiguous PRs and authorized sequential roles, source review and actual CLI exercises | mixed | open |
| AC-69 | Dictionary-only discovery reads no instruction bodies; v1.2 metadata/get contracts and no-facet outputs meet the current contract after corpus migration | SR-10, SR-11, SR-92, SR-93 | Catalog-only fixture, current public library tests, migrated corpus and matched read/output accounting | auto | open |

The earlier 598-test coverage gate, 24-query parity, corpus checks and real-corpus CLI exercises are historical evidence for their bound inputs, not acceptance of current Source. AC-65–AC-69 remain open until the full migrated suite and corpus checks qualify current hashes. The substitution mapping follow-up remains in next-actions. These criteria do not establish rights, donor admission, installation or Runtime acceptance.

## What we do not prove

| Topic | Why | State |
|---|---|---|
| VP Runtime acceptance | requires product registration and a runtime request (D3, D8) | gap |
| Qualification on real hosts | this packet proves formats and fixtures only; Codex `host-verified` is the historical D4b status, with no new host install/run; Claude and Cursor have no runtime qualification | gap |
| Cross-platform injected rollback failure | the existing write-failure injection depends on Windows `attrib`; non-Windows runs explicitly skip it | gap |
| Marketplace installation | requires a public Git repository | gap |
| Data of real users | ethical and legal constraints; out of scope | gap |
| Legal opinion on donor licenses | requires a specialist; within VP — attribution only | gap |
