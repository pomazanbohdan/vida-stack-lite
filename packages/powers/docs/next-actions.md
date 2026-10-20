---
type: Implementation Plan
title: 'Vida Powers — next actions within packages/powers'
description: 'The sequence of work in the product directory: harness and skeleton, canonical documents, catalog with scripts, vertical slice of the corpus, skills and manifests, Work Items and findings, runtime requests — with explicit gates and checks.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- implementation-plan
- next-actions
- scoped-plan
sources:
- id: roadmap
  resource: /implementation-plan.md
  title: Vida Powers — next actions within packages/powers
- id: d9
  resource: /decisions/D9-scoped-to-powers.md
  title: 'D9 — Work scope: only packages/powers'
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: agent-package-conventions
  resource: /../../agent/package.json
  title: Vida Agent package — Bun package conventions
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '2'
---

# Goal and boundaries

The scope of work is limited to the `packages/powers/` directory (D9). The shared root files
of the repository are not changed; registration of the product in them — a deferred dependency.

The goal of this queue: **a provable pipeline with the corpus and the skills**, suitable for
the Standalone environment, with checks that are executed rather than declared.

**Infrastructure constraint (owner decision, 2026-10-19):** the plugin **has no
infrastructure of its own**. The project runtime is Bun 1.4.3; the plugin introduces no
runtime, bundler, package manager, CLI framework or test
runner of its own. The plugin code is **runtime-agnostic**: only standard `node:` modules,
no external dependencies and no Bun-specific APIs in the runtime part.
**Scripts shipped in the skills** (setup, instruction search) —
plain TS without a build: they run under Bun, Node or Deno. Machine data that the code
reads — **JSON**; YAML remains for human manifests (`donors.yaml`).

# Order and gates

```
A0 (gate) ──► A harness+skeleton ──► B canonical documents ──► C catalog+scripts
                                                            │
                                                            ▼
                                      D vertical slice of the corpus (superpowers)
                                                            │
                        ┌───────────────────────────────────┴────────────────┐
                        ▼                                                    ▼
              E skills + manifests                             F Work Items + findings
                        └───────────────────────────────────┬────────────────┘
                                                            ▼
                                              G runtime requests (documents)
```

| Step | Content | Gate (evidence required) | Estimate | Status |
|---|---|---|---|---|
| **A0** | Check the risk for the foreign lint gate before the first TS file | `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0 | S | **closed 2026-10-19** |
| **A** | Product skeleton and harness **following the conventions of `packages/agent`** (without its own infrastructure): `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml`, its own install directory (`bun.lock`), the directories `scripts/ tests/ config/ instructions/ skills/ docs/work/ docs/requests/` | `bun run --cwd packages/powers test` → 13 pass / 0 fail; `bun run --cwd packages/powers typecheck` → "No type errors"; a plain-TS script runs identically under `node` and `bun` | S | **closed 2026-10-19** |
| **B** | Product canonical documents: `business-requirements.md`, `system-specification.md`, `acceptance.md`, the matrix research § → SR § → AC id | The matrix is complete; `check-okf.ts` → exit 0; doc-check → `failures: []` | M | **closed 2026-10-19** |
| **C** | Catalog and scripts: VP schemas in `config/`, the frontmatter parser, the catalog model with the operations `catalog.tags/search/get/compose` and a deterministic `decision.evaluate`, the CLI, the seed corpus, `catalog.json`, `corpus-map.json`, `scripts/check-corpus.ts`, `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `bun run --cwd packages/powers test` → 0 fail; `test:coverage` → threshold 1.0; `typecheck` → 0 errors; `check-corpus.ts` → exit 0; knip → `{"issues":[]}`; doc-check → `failures: []` | M | **closed 2026-10-20** |
| **D** | Vertical slice of the corpus (superpowers + ponytail): donor inventory, selection, segmentation into atomic instructions, merging of duplicates, rendering `.md` with `provenance`; the processing map `corpus-map.json`; the converter `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `check-corpus.ts` → exit 0; map ↔ corpus consistent; `provenance` ↔ `donors.yaml`; tag vocabulary approved by the owner in a batch pass | M | **closed 2026-10-20** (corpus of 102 instructions); donors outside the MVP pair — a separate step |
| **E** | The skills `vp-mode` (orchestration) and `vp-setup` (setup) in `skills/`, together with the **shipped scripts** `skills/*/scripts/` (setup, instruction search) — plain TS without a build; per-host `plugin.json` and `marketplace.json`; `vp-setup` writers (Standalone → the managed YAML block in `AGENTS.md`/`CLAUDE.md`) | A repeated setup run → an empty diff; setup does not change the installed agent package; the manifests are schema-valid; the shipped scripts run without Bun-specific APIs (verified by running under `node`) | M | not started |
| **F** | VP Work Items in `docs/work/` (OKF concepts with stable IDs, AC, evidence); findings JSONL (Standalone, append-only); `artifact_contract` | A Work Item has an ID/AC/evidence and links; findings: a repeated delivery creates no event; the dedup cases are recorded | M | not started |
| **G** | Runtime requests as documents in `docs/requests/`: one request for D3+D8 (extended instruction registry + profile reading) | The request has an owner, a list of files, a measurable result | S | not started |

# Key decisions of the queue

- **B before C:** the S-documents fix the contract of `catalog.*` and of the profile; the code implements
  an already approved contract, not an assumption.
- **C before D:** the catalog format is verified on an empty/smallest set
  before scaling to the donors.
- **D as a vertical slice:** one donor (superpowers) proves the whole pipeline
  inventory → instructions → tags → dedup → provenance. After it — ponytail,
  matt-skills, addy-skills, BMAD, pstack, GSD by the same exit criteria.
- **E after D:** the skills consume the catalog; first — a proven catalog.
- **F in parallel with E** (different files: `docs/work/` and `skills/`), but one writer per
  file.
- **G last:** the runtime request is formed on the basis of implemented contracts, not
  on the basis of an intention.

# Requirements for the first TS file (A0 gate)

1. `packages/powers` is **not** part of the workspace of the root package → `bun run --cwd packages/powers test`
   must work on its own `package.json` and its own `bunfig.toml`.
2. The agent's knip scans the repository as a whole; a workspace for `packages/powers` has been added
   (owner decision, D9 rev 2): `packages/agent/knip.config.ts`, the block `packages/powers`
   with `entry: ['scripts/*.ts', ...tests]`, `project: [codeFiles]`, `ignoreBinaries: ['check']`;
   the `.tmp` scratch directory is excluded by `.gitignore` itself; the pattern `skills/*/scripts/*.ts`
   is added at step E, when the skills directory appears (otherwise knip gives a config hint).
   Confirmation of the risk by an actual run: `bun run --cwd packages/agent
   lint:knip:pinned` — **executed 2026-10-19**, `{"issues":[]}`, exit 0.
3. If the run reveals other remarks (e.g. "unlisted binary" for `bun`), the decision is
   a pinpoint edit of the `packages/powers` block in the knip config (owner exception D9 rev 2).
4. VP tests must not depend on the agent's dependencies; the standard Bun library
   and local modules.

# Files of the queue (all in `packages/powers/`)

| Path | Responsibility | Step |
|---|---|---|
| `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml` | The package skeleton, mirrors the conventions of `packages/agent` | A |
| `skills/vp-mode/scripts/catalog.ts` | The `catalog.*` operations + `decision.evaluate` | C |
| `scripts/convert.ts` | The donor → catalog converter | D |
| `scripts/check-corpus.ts` | Corpus check: tags, provenance, dedup, coverage | D |
| `scripts/check-okf.ts` | Check of the OKF compatibility of the bundle (already created) | existing |
| `config/vpcatalog.v1.schema.json`, `config/vpinstruction.v1.schema.json`, `config/vpeffectiveprofile.v1.schema.json`, `config/vpcorpusmap.v1.schema.json` | VP schemas | C |
| `catalog.json` | Catalog manifest: identity, tag vocabulary, aliases, corpus listing with `sha256` | C |
| `corpus-map.json` | Processing map: donor + file → converted/split/merged/rejected | D |
| `instructions/` | Canonical instructions: `.md` + metadata, flat | D |
| `skills/vp-mode/SKILL.md`, `skills/vp-setup/SKILL.md` + their `scripts/` | Orchestration and setup skills together with the tooling | C, D, E |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin/marketplace manifests | E |
| `docs/work/` | VP Work Items (OKF concepts) | F |
| `docs/requests/` | Runtime requests to the agent maintainer | G |
| `docs/business-requirements.md`, `docs/system-specification.md`, `docs/acceptance.md` | Product canonical documents | B |
| `tests/` | Bun tests of the VP harness | A–F |

# Deferred dependencies (outside the current scope)

| Dependency | Blocks | Status |
|---|---|---|
| Registration in the root files (sidecar, config, doc-policy, products.map, README, knip, root package.json) | VP Runtime mode, CI, inclusion in the documentation policy | Deferred (D9) |
| Runtime request D3+D8: extended instruction registry and profile reading | Bundled mode, Runtime integration | The request is being prepared in G |
| Cutover of `.vida/*` | Runtime mode with the target layout | External runtime track |
| A public Git repository for the marketplace | Channel 3 | Requires an owner decision |

# Definition of done for the queue

The queue is considered closed when: (1) the corpus of superpowers + ponytail
has been converted and verified (`check-corpus.ts` → exit 0); (2) `catalog.*` and
`decision.evaluate` have tests and work without Runtime; (3) `vp-mode` and `vp-setup`
install locally and idempotently; (4) a VP Work Item has been created with AC and
evidence; (5) the runtime request D3+D8 has been issued; (6) `check-okf.ts` and the repository
doc-check pass; (7) the whole bundle log `docs/log.md` reflects these changes.
