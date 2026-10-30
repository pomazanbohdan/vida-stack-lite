---
type: Task Plan
title: 'Vida Powers — task-level plan for step D: vertical slice of the corpus'
description: 'Extending the canonical instruction corpus beyond the seed batch: processing the donors in phases (inventory → selection → segmentation → merging → tag package → conversion → validation), with batch approval of the tag vocabulary by the owner for each donor.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- task-plan
- corpus
- implementation
sources:
- id: design
  resource: /catalog-design.md
  title: Vida Powers — instruction catalog design
- id: step-c-plan
  resource: /task-plan-step-c.md
  title: Vida Powers — task-level plan for step C
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-20T12:00:00Z' }
revision: '4'
---

**Goal:** extend the canonical instruction corpus beyond the seed batch of step C
(12 instructions) — process the donors of the MVP pair (superpowers, ponytail) by the phases of
design §5a and bring the corpus to a state suitable for step E (skills).

**The specification this plan follows from:** `docs/catalog-design.md` §5a (processing
phases), §6 (tag vocabulary and manifest), `docs/system-specification.md`
(SR-06…SR-08, SR-15, SR-66, SR-76), `docs/task-plan-step-c.md` (the closed contracts
of step C), `docs/research/vida-powers-product-research.md` §4.1 (donor boundaries).

## Global Constraints

- **A source is mandatory.** Each instruction has at least one source
  (`donor`, `license`, `revision`, `path`); synthetics without a source are forbidden.
  `revision` equals `donors.yaml[donor].head_sha`.
- **One norm — one instruction.** Duplicates are merged: the instruction carries all
  sources in `provenance[]`; the discarded duplicates do not exist separately.
- **The tag vocabulary is owner content.** The agent does not add tags to the vocabulary; at
  the completion of processing a donor it submits a **package** (tag + description + where it is used), and
  the owner approves it in a single pass. Then the tags enter `catalog.json`.
- **The language of instructions is the donor original (D11).** The body of an instruction is the normative
  text of the donor **in the original language**; an instruction is **not translated** and not
  rewritten "in our own words". Permitted edits: cutting the irrelevant,
  merging duplicated sentences, neutralizing donor names, moving the binding
  to the norm, adding an explicit completion criterion if the donor lacks it. Forbidden:
  translation, inventing rules, weakening strictness, adding requirements that the
  donor does not have. The review compares the instruction with the **original** and records every
  divergence.
- **The tag vocabulary, schemas, error codes, tool texts — in English** (D11).
- **A single writer.** `scripts/convert.ts` writes `instructions/`, `catalog.json` and
  `corpus-map.json` (CAT-D3, SR-76). Runtime scripts only read.
- **The map covers every carrier file.** For each donor file — an entry
  `converted` / `split` / `merged` / `rejected` (with a reason for `rejected`).
  Rejections are recorded in the map, not in a separate report.
- **Rejection criteria (owner decision, 2026-10-20).** An instruction is a norm
  that requires an action **or** sets agent behavior (action, format, conciseness, tone,
  response structure). Rejected (with a reason in the map): the evolution history of the donor
  (plans, specifications, changelog, creation logs), the donor's repository rules
  (`AGENTS.md`, `GEMINI.md`, `README.md`, `CODE_OF_CONDUCT.md`, `.github/**`),
  host infrastructure (installation, migration, tool maps, OS hooks),
  the donor's evaluation materials (its test scenarios). Everything else **is broken down into
  norms**: from templates and prompts the rule is taken, not the template; agent
  diagnostics — methodology ✓.
- **Segmentation — down to atoms.** One skill/file of the donor is cut into several
  instructions; one norm = one instruction.
- **Duplicates across donors — an owner decision.** If the same pattern exists in
  several donors with different wordings, the agent does not choose itself: it assembles
  a **conflict package** (sets of wordings, sources, currency assessment) and
  the owner approves which variant remains (old donors may lag behind;
  currency is verified against external sources).
- **The limit is not on the corpus but on the bundle.** The corpus has no size limit: limited
  to ≤ 20 instructions and ≤ 64 KB is only what **enters the session** (SR-58, AC-26:
  bootstrap loads only the bundle, not the whole corpus). Owner decision (2026-10-20):
  the corpus from superpowers must be **broad** — one norm = one atomic instruction,
  full coverage of the donor's norms, not "one instruction per file".
- **Boundary rules.** Runtime-agnosticism (`node:` modules only in
  `skills/*/scripts/`), version only in metadata, machine formats — JSON.

## Phases of donor processing (one iteration per donor)

| Phase | Who | Artifact | Gate |
|---|---|---|---|
| 1. Inventory | script | `.tmp/inventory/<donor>.json` (path, size, frontmatter, headings) | deterministic from the pinned clone |
| 2. Selection | agent | `rejected` entries with a reason for non-methodology | every carrier file has an entry |
| 3. Segmentation | agent | instruction specifications (JSON) in `.tmp/` | one norm = one specification |
| 4. Merging | agent | updated specifications (several sources in `provenance[]`) + `merged` entries | the duplicate does not exist separately |
| 5. Tag package | agent → owner | package proposal (tag + description + where it is used) | **owner approval in a single pass** |
| 6. Conversion | `convert.ts` | `instructions/`, `catalog.json`, `corpus-map.json` | idempotency; only three targets |
| 7. Validation | `check-corpus.ts` | check report | `issues: []`, exit 0 |

## Tasks of step D

### Task D1 — Converter: map entries for rejections and merges

**Files:** extend `scripts/convert.ts` + `tests/convert.test.ts`.

- New input: a map entry specification — `{ donor, source_revision, path,
  status: 'rejected' | 'merged', reason?, instruction_ids?, contributed_sources? }`.
  `rejected` → `{ status, reason }`; `merged` → `{ status, instruction_ids,
  contributed_sources }`; a `rejected` entry without a reason → an error.
- The entry is written to `corpus-map.json` (the single writer), idempotently; `donors[donor].source_revision`
  is updated only when it is the same donor (a revision difference → an error, as in
  the current implementation).
- Tests: a `rejected` entry with a reason; `merged` with `instruction_ids` and
  `contributed_sources`; `rejected` without a reason → an error; a repeated entry →
  byte-for-byte idempotent; the map remains valid per `vpcorpusmap.v1`.

### Task D2 — Processing the superpowers donor

- Phases 1–5 for the remaining carrier files of superpowers (11 SKILL.md are already in the corpus):
  selection of non-methodology with reasons, segmentation, merging, a draft of specifications
  and a **tag package for owner approval**.
- The output of phase 5 — drafts in `.tmp/` + the tag package for the owner.

### Task D3 — Processing the ponytail donor

- The same for ponytail (1 instruction in the corpus): in particular the `gain`/`debt`/
  `audit`/`review` family and the merging of duplicates of the ponytail rule from different host
  formats (.opencode/.clinerules/.kiro/.qoder/.windsurf) into one instruction.

### Task D4 — Materialization and validation

- Phases 6–7 for the processed donors: conversion, `check-corpus.ts` → `issues: []`,
  CLI operations against the real catalog, commit.
- After each donor — an entry in `docs/log.md` (OKF §9).

## Execution progress

| Task | Status | Evidence |
|---|---|---|
| D1. Converter: map entries, removal, `split` | **closed** | `scripts/convert.ts`, `tests/convert.test.ts` — `--map-record` (rejected / merged / split), `--remove`, alias canonization, idempotency; 3 review rounds |
| D2. Superpowers donor | **closed** | 120 files → 73 instructions, 8 conflicts removed by narrowing, 72 rejections; content review: 1 blocker (an invented norm) + 7 major/minor — closed |
| D3. Ponytail donor | **closed** | 60 files → 13 instructions, 12 merges, 36 rejections; 4 new tags approved |
| D4. Materialization and validation | **closed** | corpus of 161 instructions (superpowers + ponytail + pstack); `check-corpus.ts` → `issues: []`; the map has 314 entries (37 split / 149 converted / 14 merged / 114 rejected); 230 tests, coverage 100 % |

**Status addendum (2026-10-21):** the donors outside the MVP pair — BMAD, matt-skills, addy-skills, pstack, gsd-core and open-knowledge-format — were all processed; the corpus is 2510 instructions. Steps E, F and G remain.

**Scope clarification (2026-10-22):** "Outside the plan" and "remaining" below describe the original scope of step D. The 2026-10-21 status addendum records that all remaining donors were later processed.

**Outside the plan of step D (remaining):** donors outside the MVP pair (BMAD, matt-skills,
addy-skills, pstack, gsd-core) — a separate step with an owner decision on the boundary;
step **E** (skills and manifests), **F** (Work Items/findings), **G** (runtime request).

## Outside this plan

- Step **E**: `skills/vp-mode/SKILL.md`, `skills/vp-setup/`, per-host manifests.
- Step **F**: VP Work Items and findings; step **G**: the runtime request D3+D8.
- Donors outside the MVP pair (BMAD, matt-skills, addy-skills, pstack, gsd-core) —
  a separate step D with its own owner decision on the boundary.

## Definition of done for step D

1. `bun packages/powers/scripts/check-corpus.ts` → `issues: []`, exit 0.
2. `bun run --cwd packages/powers test` → 0 failures; `test:coverage` → threshold 1.0.
3. `bun run --cwd packages/powers typecheck` → 0 errors.
4. `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0.
5. `bun packages/powers/scripts/check-okf.ts` → `failures: []`.
6. Each donor — a separate tag package approved by the owner; **materialization —
   in an atomic commit** (the manifest, the map and the corpus must not be in a partial state: a partial
   manifest is not read by the validator).
