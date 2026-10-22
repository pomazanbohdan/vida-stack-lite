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
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '4'
---

Each criterion: **ID**, condition, **binding to an SR**, **evidence**, **type**, **state**.
Types: `auto` — executed by a command; `manual` — requires observation by a human or
an attached agent; `external` — evidence outside VP (host qualification, marketplace,
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
| AC-10 | The deterministic `decision.evaluate` returns a shortlist; each refusal trigger (no candidates, unknown candidate ID, candidate outside the admissible, malformed format) returns the refusal reason while preserving scope, policy and validation | SR-16, SR-18 | refusal test table | auto | open |
| AC-11 | The decision result contains the identification of the source, the selected IDs and the refusal reason; the reason is not empty | SR-20 | decision materialization test | auto | open |
| AC-12 | The threshold is applied only to a calibrated operation; an uncalibrated operation returns the uncalibrated marker; v1 has no semantic scoring — it is performed by the skill | SR-21, D5 | calibration test | auto | open |
| AC-13 | Routing returns the selected LLM, the formed agents from the bundle (role, task contract, methodology, scope, materialization requirements, artifacts) and the flow level | SR-22, SR-23 | routing test | auto | open |
| AC-14 | Routing creates no execution graph of its own: the result contains no stage plan of its own | SR-24 | absence-of-graph test | auto | open |

## Methodology profile

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-15 | An inheritance conflict between two alternatives stops the choice and formulates a question to the owner; the "last one wins" rule is not applied; groups and alternatives come from the profile | SR-25, SR-28 | profile conflict test | auto | open |
| AC-16 | A task-scoped override is recorded, passed to child agents and does not change the permanent profile, other products, permissions or security gates | SR-29 | override test | auto | open |
| AC-17 | The semantics of an instruction does not change under the same ID; a change of behavior requires a new pattern ID | SR-30 | identity test | auto | open |
| AC-18 | The `Light` level does not skip mandatory AC, materialization and mandatory gates | SR-31 | depth profile test | auto | open |
| AC-19 | The same profile section is read from three carriers (`.vida/project.yaml`, the managed YAML block, the project config file) with the same result | SR-33 | carrier test | auto | open |

## Materialization, findings, scope

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-20 | Every content operation leaves an artifact per `artifact_contract` or an explicitly recorded update of an existing one | SR-37, SR-38 | materialization test | auto | open |
| AC-21 | The presence/format/digest check and the semantic check are different operations; closing an AC requires both | SR-41 | checks test | auto | open |
| AC-22 | A repeated delivery of the same message creates no new event in the findings register; a confirmed duplicate is linked to the canonical `finding_id` while preserving the new evidence | SR-45 | dedup case table | auto | open |
| AC-23 | A finding that goes beyond the Work Scope is recorded as a blocker with a permission request; the scope is not expanded | SR-53, SR-54 | scope test | auto | open |
| AC-24 | Creating a finding does not authorize a fix | SR-43 | finding↔work link test | auto | open |

## Operational rules and formats

| ID | Condition | SR | Evidence | Type | State |
|---|---|---|---|---|---|
| AC-25 | A repeated `vp-setup` on unchanged input yields an empty diff; setup changes no file of the installed agent package | SR-56, SR-57 | idempotency test + read-only check | auto | open |
| AC-26 | Bootstrap does not load the whole corpus: the bundle is limited to ≤ 20 instructions and ≤ 64 KB of total text | SR-58 | bundle measurement before handover | auto | open |
| AC-27 | The absence of a host capability is marked as a limitation, not as a completed check | SR-59 | host matrix | manual | open |
| AC-28 | The same script shipped in the skills runs without a build under `node`, `bun` and `deno`; it contains no Bun-specific APIs | SR-63 | run under three runtimes + static check | auto | open |
| AC-29 | `compose` with an effective profile discards instructions with an inactive group alternative; without a profile — an error on a direct `compatibility_excludes` pair | SR-26, SR-28, SR-14 | compose test with and without a profile | auto | open |
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

## What we do not prove

| Topic | Why | State |
|---|---|---|
| VP Runtime acceptance | requires product registration and a runtime request (D3, D8) | gap |
| Qualification on real hosts (other than Codex) | requires access to the hosts | gap |
| Marketplace installation | requires a public Git repository | gap |
| Data of real users | ethical and legal constraints; out of scope | gap |
| Legal opinion on donor licenses | requires a specialist; within VP — attribution only | gap |
