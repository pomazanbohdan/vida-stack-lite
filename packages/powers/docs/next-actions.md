---
type: Implementation Plan
title: 'Vida Powers — next actions within packages/powers'
description: 'The original A-G delivery sequence plus the separately accepted, phased D14/D15 content extension in Step H.'
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
generated: { by: codex/gpt-6.1-sol, at: '2026-10-26T15:16:58Z' }
verified: { by: human:repository-owner, at: '2026-10-19T14:11:01Z' }
revision: '25'
---

# Goal and boundaries

The scope of work is limited to the `packages/powers/` directory (D9). The shared root files
of the repository are not changed; registration of the product in them — a deferred dependency.

The goal of this queue: **a provable pipeline with the corpus and the skills**, suitable for
the Standalone environment, with checks that are executed rather than declared.

**Infrastructure constraint (owner decision, 2026-10-19):** the plugin **has no
infrastructure of its own**. The product runtime is Bun 1.4.4; the plugin introduces no
runtime, bundler, package manager, CLI framework or test
runner of its own. The plugin code is **runtime-agnostic**: only standard `node:` modules,
no external dependencies and no Bun-specific APIs in the runtime part.
**Scripts shipped in the skills** (setup, instruction search) —
plain TS without a build: they run under Bun, Node or Deno. Machine data that the code
reads — **JSON**; YAML remains for human manifests (`donors.yaml`).

# Order and gates

The read-only `scripts/packet.ts` proposal checker reports mechanical checks and
unchecked bases; independent final review and corpus custody remain open. It does
not grant semantic acceptance or authorize a migration.

```
A0 (gate) ──► A harness+skeleton ──► B canonical documents ──► C catalog+scripts
                                                            │
                                                            ▼
                                      D full eight-donor corpus
                                                            │
                        ┌───────────────────────────────────┴────────────────┐
                        ▼                                                    ▼
              E skills + manifests                             F Work Items + findings
                        └───────────────────────────────────┬────────────────┘
                                                            ▼
                                              G runtime requests (documents)
                                                            │
                                                            ▼
                                  H D14/D15 content extension (H0 → H1 → H2 → H3)
```

| Step | Content | Gate (evidence required) | Estimate | Status |
|---|---|---|---|---|
| **A0** | Check the risk for the foreign lint gate before the first TS file | `bun run --cwd packages/agent lint:knip:pinned` → `{"issues":[]}`, exit 0 | S | **closed 2026-10-19** |
| **A** | Product skeleton and harness **following the conventions of `packages/agent`** (without its own infrastructure): `package.json`, `.bun-version`, `tsconfig.json`, `bunfig.toml`, its own install directory (`bun.lock`), the directories `scripts/ tests/ config/ instructions/ skills/` | `bun run --cwd packages/powers test` → 13 pass / 0 fail; `bun run --cwd packages/powers typecheck` → "No type errors"; a plain-TS script runs identically under `node` and `bun` | S | **closed 2026-10-19** |
| **B** | Product canonical documents: `business-requirements.md`, `system-specification.md`, `acceptance.md`, the matrix research § → SR § → AC id | The matrix is complete; `check-okf.ts` → exit 0; doc-check → `failures: []` | M | **closed 2026-10-19** |
| **C** | Catalog and scripts: VP schemas in `config/`, the frontmatter parser, the catalog model with the operations `catalog.tags/search/get/compose` and a deterministic `decision.evaluate`, the CLI, the seed corpus, `catalog.json`, `corpus-map.json`, `scripts/check-corpus.ts`, `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `bun run --cwd packages/powers test` → 0 fail; `test:coverage` → threshold 1.0; `typecheck` → 0 errors; `check-corpus.ts` → exit 0; knip → `{"issues":[]}`; doc-check → `failures: []` | M | **closed 2026-10-20** |
| **D** | Full eight-donor corpus: donor inventory, selection, segmentation into atomic instructions, merging of duplicates, rendering `.md` with `provenance`; the processing map `corpus-map.json`; the converter `scripts/convert.ts`; the shipped tooling — in `skills/vp-mode/scripts/` | `check-corpus.ts` → exit 0; map ↔ corpus consistent; `provenance` ↔ `donors.yaml`; mapping pass first; agent creates genuinely new unique tags; owner approves the corpus | M | **closed 2026-10-20 for MVP; extended 2026-10-21** (2510 instructions from 8 donors; 2790 processing-map records) |
| **E** | The skills `vp-mode` (orchestration) and `vp-setup` (setup) in `skills/`, together with shipped scripts; per-host manifests generated by the package builder; E5a source/schema/fixture implementation; [E5b native layouts and deferred hosts](task-plan-step-e.md#e5-target-status) | Repeated setup is idempotent; manifests match supported formats, validate rooted skills and ownership, and preserve read-only recovery checks; shipped skill scripts remain runtime-agnostic | M | **in progress** — E1–E3 closed; E4 implemented; `.54` formed local Muse/Antigravity fixtures, but Muse catalog is `MANIFEST_MUSE_CATALOG_NOT_READY` and production input/output are absent. The locally verified `.65` review marks `.62` CODE+EVIDENCE READY with no code blocker; see [Step H](task-plan-step-h.md) for the exact receipt and `.67`/`.70` evidence. `.67` remains `NOT_CLOSED` with `packagePass: false`. Muse digest proof, host installation, publication, legal review and Runtime acceptance remain open. Deno unavailable |
| **F** | VP Work Items in `docs/work/` (OKF concepts with stable IDs, AC, evidence); append-only Standalone findings store API, CLI caller, `artifact_contract`, and caller procedure | Query-before-append; exact replay; explicit merge event; scope and no-fix boundaries remain separate | M | **integrated in current Source (.117); Step F remains open** — Bun 1.4.3 tests: 432 pass / 1 platform skip / 0 fail. Coverage fails unchanged 1.0 thresholds: LCOV F 473/480, L 3991/4038, B 0/0; no statement counter. Uncovered lines: `catalog-cli.ts` 40-42, 138, 142-164, 169-183; `findings.ts` 314, 322-323, 343, 354. Typecheck: 29 files; Knip `issues: []`; corpus: 2,510 instructions / 0 issues; donors: 9 / OK; map/pairs/pair agreement: 0 findings; pair table: 22; fidelity audit: 1,910 divergent lines; OKF: 34 concepts / 0 failures or warnings; Markdown: 5 docs / 44 links / 0 failures. `audit specs` has no canonical JSON spec input. AC-20/21/23 open; AC-22 partial; AC-24 component-only; no real event or host/Runtime acceptance. Twelve VP request bindings need parent rebind after final F freeze and before handoff/admission; G remains open, unsent, unaccepted; root reconciliation remains open. |
| **G** | Runtime requests as documents in `docs/requests/`: one request for D3+D8 (extended instruction registry + profile reading) | The request has an owner, a list of files, a measurable result | S | **Historical published-baseline draft; unsent and unaccepted.** The request retains its `fafb401` binding. The catalog reader and CLI have changed, so a refreshed published-Source binding is required before handoff. G admission and Runtime acceptance remain open. See [REQ-D3-D8](requests/REQ-D3-D8-runtime-request.md) for the exact historical binding. |
| **H** | D14/D15 accepted scope, implemented only through the gated phases in [Step H](task-plan-step-h.md): baseline closeout, rights-cleared Wondelai method subset, engineering/UX applicability and CSV map, then selected typed JSON resources | H0 current hash-bound gates and review record; H1 complete disposition and rights/fidelity evidence; H2 versioned applicability and cell-level evidence; H3 exact-ID, safety and shared-budget evidence | L | **Source tooling published; H1 preparation remains open.** Ten sources have 602 held units and 57 bounded model comparisons; no complete/admitted source packet is evidenced. The owner approved excluding 60 out-of-carrier copies while preserving 421/30/391 intake accounting. Selected-text disposition, rights, human fidelity, admission, the ten-file pilot, matched measurement, H2/H3 and Runtime acceptance remain open. Current evidence and policy-binding reconciliation are tracked in the existing donor-migration WORK directory. |

# Key decisions of the queue

- **Current runtime qualification (2026-10-25):** the owner-selected Powers pin is Bun 1.4.4. The canonical `test:coverage` run records 533 passed, one expected Windows skip, zero failures and native exit 0, with 535/535 functions and 4,225/4,225 lines under unchanged 1.0 function/line/statement thresholds (seed 20261019). Statement and branch counters are not separately claimed. Strict typecheck passes 36 files. The final Source/test delta reviews are READY; Root strengthened their remaining error-code assertions and reran the full coverage gate. Receipts are in `../.tmp/panel/donor-migration-architecture-20261025/coverage-package-final-2.json` and `coverage-typecheck-final-1.json` in that directory. F caller qualification, real donor admission, rights, delivery and Runtime acceptance remain separate open gates. The `.117` Bun 1.4.3 and `.144` Bun 1.4.4 results are historical receipts, not current package coverage. Frozen donor preparations retain their bound runtime; new product work uses 1.4.4.

- **B before C:** the S-documents fix the contract of `catalog.*` and of the profile; the code implements
  an already approved contract, not an assumption.
- **C before D:** the catalog format is verified on an empty/smallest set
  before scaling to the donors.
- **D began as a vertical slice:** superpowers proved the pipeline
  inventory → instructions → tags → dedup → provenance. The same exit criteria were
  then applied to all eight donors: superpowers, ponytail, matt-skills, addy-skills,
  bmad-method, pstack, gsd-core and open-knowledge-format.
- **E after D:** the skills consume the catalog; first — a proven catalog.
- **F in parallel with E** (different files: `docs/work/` and `skills/`), but one writer per
  file.
- **G draft and handoff:** the request may be prepared from the approved D3/D8 contracts
  without waiting for F or E5a inputs. Its existing `fafb401` published-baseline binding
  remains historical: current catalog-reader and CLI bytes differ. Keep the request unsent
  and unaccepted until it is rebound to the explicitly selected published Source before
  handoff. Attributable handoff and admission remain open; see the Step G status row.
- **H is phased after the current core closeout:** H1 uses the Markdown pipeline only after rights/admission review; H2 owns engineering/UX applicability and CSV cell mapping; H3 adds typed resources only after H2. No estimates or earlier phase receipts close a later gate.
- **2026-10-25 scope reconciliation:** D14/BR-22/SR-81/AC-47 now include individually selected product/business methods. SR-88–SR-91 and AC-56–AC-59 govern source packets, Root admission, prepared publication/recovery and matched measurement. [Step H](task-plan-step-h.md#source-packet-and-publication-qualification) owns the execution order and current evidence pointer. Raw capture and synthetic qualification do not close the admitted H1 pilot.

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
| `skills/vp-mode/SKILL.md`, `skills/vp-setup/SKILL.md` and their `scripts/` | Orchestration and setup skills together with the tooling | C, D, E |
| `docs/task-plan-step-e.md` | Detailed plan and progress for step E1-E5 | E |
| `docs/task-plan-step-h.md` | Phased D14/D15 plan with H0-H3 gates | H |
| `.codex-plugin/`, `.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/` | Per-host plugin/marketplace manifests | E |
| `docs/work/` | VP Work Items (OKF concepts) | F |
| `docs/requests/` | Runtime requests to the agent maintainer | G |
| `docs/business-requirements.md`, `docs/system-specification.md`, `docs/acceptance.md` | Product canonical documents | B |
| `tests/` | Bun tests of the VP harness | A–F |

# Deferred dependencies (outside the current scope)

| Dependency | Blocks | Status |
|---|---|---|
| Registration in the root files (sidecar, config, doc-policy, products.map, README, knip, root package.json) | VP Runtime mode, CI, inclusion in the documentation policy | Deferred (D9) |
| Runtime request D3+D8: extended instruction registry and profile reading | Bundled mode, Runtime integration | See the Step G status above |
| Cutover of `.vida/*` | Runtime mode with the target layout | External runtime track |
| A public Git repository for the marketplace | Channel 3 | Requires an owner decision |

# Definition of done for the queue

The original A-G queue is considered closed when: (1) the eight existing donors have been
processed, the corpus contains 2510 instructions and the map contains 2790 file records
(`check-corpus.ts` → exit 0); (2) `catalog.*` and `decision.evaluate` have tests and work
without Runtime; (3) `vp-mode` and `vp-setup` install locally and idempotently; (4) a VP
Work Item has AC and evidence; (5) the D3+D8 request has been issued; (6) `check-okf.ts`
and repository documentation checks pass; and (7) `docs/log.md` records the changes.
Step H is a separate accepted scope extension. It is complete only under the H0-H3 definition
in `task-plan-step-h.md`; accepting D14/D15 does not close those implementation gates.

## D16 instruction organization

The owner authorized stable canonical files with independent form/domain facets. [D16](decisions/D16-faceted-instruction-browse.md), BR-24 and [SR-92](system-specification.md#15-faceted-instruction-metadata-d16) own the contract; AC-60–AC-64 remain open.

1. Frozen 40-ID sample, 24 selectors and relevance judgments: captured. Old-code baseline: 30 fresh-process runs and 2,400 warm queries; same-input three-structure prototype: captured. Beam accepted the exact evidence as READY_AS_OLD_CODE_BASELINE_AND_STRUCTURE_PROTOTYPE. Retained evidence: packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/baseline-prototype-root-r3/. These results establish no speedup or full-corpus recall.
2. The historical v1.1 schema/reader, optional filters, generated browse, opt-in strict corpus check and converter-owned metadata staging were Root-qualified and independently reviewed by Beam for their bound inputs. The historical converter milestone passed 564 tests with one expected Windows skip and zero failures, with 100% functions/lines; typecheck, knip and 24 old no-facet queries passed for those inputs. The separate 40-item model-classification ledger was reviewed. Luna's isolated trial tools were prepared, but Root's static preflight review was NOT_READY: one inherited D16 binding was stale, await expressions occurred in parameter defaults, and the before-state check compared legacy classification with future assignments. No tool mode, fixture or trial batch was executed in that attempt. Current v1.2 Source and migration require fresh binding and qualification; no substitute or independent PASS is inferred.
3. Review the exact prepared 40-ID treatment, then execute it in isolation and compare matched results under the frozen protocol.
4. After trial acceptance, classify every frozen rollout ID or retain an explicit source-bound unclassified reason, apply reviewed converter batches and run strict corpus/package gates.
5. Root publishes only the qualified reviewed Source. Formation, installation and attributable Runtime acceptance remain separate. H1 rights, fidelity, admission and pilot gates remain unchanged.

## Owner-requested retrieval workflow refinement

The owner refined the instruction-discovery workflow on 2026-10-26: vp-mode must explain how tasks become search terms and canonical tags; list-valued CLI flags accept one occurrence such as --query pr review and --id A B; lists return ID plus description; applicable results are deduplicated by canonical identity; all chosen texts are fetched together; opposing instructions retain declared profile/compatibility handling. Direction, capability, pattern, form and context remain separate axes. Root .tmp snapshots are explicit source selections, not an implicit union with production.

The current derived design is RETRIEVAL-DESIGN-r3.md with VP-MODE-ROUTING-PROPOSAL-r3.md; the executable task plan is RETRIEVAL-IMPLEMENTATION-PLAN-r1.md, all under packages/powers/.tmp/panel/donor-migration-architecture-20261025/instruction-organization-20261026/implementation-r1/. These are implementation inputs, not replacements for canonical B/S. BR-24/SR-93 now reconcile the compact CLI projection while preserving the existing library APIs and frozen sample outputs.

Current Source implements compact discovery, profile-aware search, approach selection and explanation, and compose-backed multi-ID text retrieval. The 598-test coverage gate, 24/24 metadata queries, corpus checks and real-corpus exercise are historical evidence for their bound inputs. The current reader and checker accept v1.2 only; all 2,510 catalog instructions have been migrated. The strict corpus check reports zero issues; AC-65–AC-69 and Runtime acceptance remain separate.

1. Reconcile the completed v1.2 migration evidence and run the remaining package gates. Legacy records are not readable through the current v1.2-only reader.
2. Resume the frozen 40-ID classification trial preparation against the current CLI/library Source once its package gates qualify; retain the original failed/prepared tools and reconcile changed bindings explicitly.
3. Keep the existing library inspection/diagnostic APIs, profile/conflict owner, atomic errors, dependency closure and session limits intact during publication.
4. Preserve the documented task-evidence routing and real CLI examples; Source publication does not establish installed skill activation or Runtime acceptance.
5. Measure the reference route, then compare optional BM25 metadata ranking only if demonstrated retrieval misses justify it. No speedup, semantic-confidence or ranking winner is assumed.
6. Repair and resume the separately frozen 40-ID trial under current exact bindings; after its acceptance, complete source-bound full-corpus classification. This is not a prerequisite for basic CLI work and does not close H1, rights, installation or Runtime gates.

Inactive-alternative dependency substitution uses the declared instruction mapping instead of the first tag carrier. Historical focused tests and corpus audit remain bound to their inputs; the audit observed 21 dependency edges, none activating substitution between then-current declared alternatives. Follow-ups remain open: define cross-group substitution semantics before expanding it and qualify current checker/profile integration. Package-wide qualification and Runtime acceptance remain separate.

The owner explicitly authorized execution: complete CLI, library and skill improvements first, then continue donor work. Preserve Luna implementation / Root integration and native checks. For every new independent validation, first try an approved free model (DeepSeek V4.1 Flash Free, Beam Free or Nemotron 3 Ultra Free); on availability/quota refusal make at most one DeepSeek V4.1 Flash fallback. The owner connected OpenCode Go and enabled Global; its verified route is opencode-go/deepseek-v4.1-flash, distinct from the opencode route that rejected insufficient balance. The next validation starts free again. A substantive NOT_READY finding requires repair, not fallback bypass. Keep measured snapshots immutable and requalify changed inputs without relabeling historical proof.
