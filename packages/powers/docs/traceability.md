---
type: Traceability Matrix
title: Vida Powers — traceability matrix
description: 'The link between the sections of the research document, the business requirements, the system specification and the acceptance criteria.'
status: draft
stale_after: '2026-11-19T00:00:00Z'
tags:
- vida-powers
- traceability
- coverage
sources:
- id: research
  resource: /research/vida-powers-product-research.md
  title: Vida Powers — product concept and architectural baseline
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers — business requirements
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers — system specification
- id: acceptance
  resource: /acceptance.md
  title: Vida Powers — acceptance criteria
- id: catalog-design
  resource: /catalog-design.md
  title: Vida Powers — instruction catalog design
generated: { by: vida-agent/minimax-m3.1-flash-free, at: '2026-10-19T14:11:01Z' }
revision: '3'
---

## Research → BR → SR → AC

| Research § | BR | SR | AC |
|---|---|---|---|
| §1 purpose, Router, `vp-setup` | BR-01, BR-05, BR-19, BR-20 | SR-22, SR-56, SR-58 | AC-13, AC-25, AC-26 |
| §2 boundaries of VP and Runtime, modes | BR-07 | SR-24, SR-52, SR-62 | AC-14 |
| §2.1 hybrid agents, role contracts | BR-01 | SR-23, SR-32 | AC-13 |
| §2.2 recursive subtasks, delegation | BR-07 | SR-44, SR-48, SR-74 | AC-22, AC-40 |
| §2.3 Selective Join, Lifecycle Scope | BR-16 | SR-48, SR-49, SR-50, SR-51 | AC-22 |
| §3 installation, bootstrap, hooks | BR-20 | SR-56, SR-57, SR-59, SR-60, SR-61, SR-75 | AC-25, AC-26, AC-27, AC-41 |
| §4.1 canonization of donors | BR-02 | SR-06, SR-07, SR-34, SR-35, SR-66, SR-76 | AC-01, AC-30, AC-30b, AC-31, AC-32, AC-42 |
| §4.2 two dimensions of tags | BR-01 | SR-02, SR-03, SR-04, SR-05 | AC-02, AC-03, AC-04 |
| §4.3 methodology as policy | BR-13 | SR-25, SR-26, SR-69 | AC-15, AC-35 |
| §4.4 inheritance, override | BR-14, BR-15 | SR-27, SR-28, SR-29 | AC-15, AC-16 |
| §4.5 Live Inheritance, snapshot | BR-04, BR-15 | SR-30, SR-67 | AC-17, AC-33 |
| §4.6 Risk-Adaptive Updates | BR-04 | SR-15, SR-21, SR-68 | AC-12, AC-34 |
| §4.7 catalog operations | BR-01 | SR-09, SR-10, SR-11, SR-12, SR-13, SR-14, SR-70 | AC-05, AC-06, AC-07, AC-08, AC-36 |
| §4.8 two selectors, Decision Provider | BR-01, BR-06 | SR-16, SR-17, SR-18, SR-19, SR-20, SR-21, SR-24 | AC-10, AC-11, AC-12 |
| §4.9 OKF, provenance | BR-02 | SR-07, SR-62, SR-65 | AC-01, AC-09 |
| §5 coverage map, Light/Medium/Full, roles | BR-01, BR-06 | SR-31, SR-32, SR-71 | AC-18, AC-37 |
| §6 artifact-first, materialization | BR-03, BR-16 | SR-37, SR-38, SR-39, SR-41, SR-42 | AC-20, AC-21 |
| §6.1 three parts of materialization | BR-16 | SR-38 | AC-20 |
| §6.2 `artifact_contract` | BR-16 | SR-06, SR-08, SR-41 | AC-20 |
| §7.1–7.6 document lifecycle | BR-04, BR-17, BR-18 | SR-40, SR-42 | AC-20, AC-21 |
| §8.1 record owners | BR-07 | SR-39, SR-44, SR-72 | AC-20, AC-22, AC-38 |
| §8.2 Scope-First | BR-08, BR-10, BR-15 | SR-53, SR-54, SR-55 | AC-23 |
| §8.3–8.4 findings, dedup | BR-11, BR-17 | SR-43, SR-44, SR-45, SR-46, SR-47 | AC-22, AC-24 |
| §9 wiki, work items, ID, relations | BR-16, BR-17 | SR-40, SR-73 | AC-20, AC-39 |
| §10 storage models | BR-03, BR-07 | SR-39, SR-42 | AC-20, AC-21 |
| §11 domains, packs | BR-22 | — | out of scope |
| §12 boundaries of autonomy, security | BR-08, BR-09, BR-10, BR-11, BR-12 | SR-18, SR-19, SR-53, SR-55, SR-63, SR-64 | AC-10, AC-23, AC-28 |
| §13 research boundaries, next work | BR-23 | — | gap |
| §14 sources | BR-02 | SR-07 | AC-01 |

**Not normative (context, not rules):** §1 "without an automatic transition to
a new scope of work" (an operational rule of the owner, not VP behavior) and §13
the list of technically open questions (closed by stages, not by the specification).

## Decision → SR/AC

| Decision | Reflected in |
|---|---|
| D1 VP = `packages/powers` | BR-21; registration — Stage 0 |
| D2 monorepo of products | BR-21; NFR-06 |
| D3 its own catalog (`.md` instructions + `catalog.json`) + extended registry in the agent package | SR-01, SR-06, SR-07, SR-15, SR-34, SR-36; AC-01, AC-09, AC-29, AC-30; runtime request; design `catalog-design.md` |
| D4 three delivery channels, skills `vp-mode`/`vp-setup` | BR-19; SR-22, SR-56, SR-58 |
| D4b marketplace owner, Codex first | BR-19; AC-27 (limitation for the other hosts) |
| D5 provider-neutral Decision Provider | SR-16, SR-17; AC-10 |
| D6 log in the bundle | NFR-05; `docs/log.md` |
| D7 environment-driven initialization | BR-20; SR-57, SR-59; AC-25 |
| D8 one profile schema, carrier per environment | SR-33; AC-19 |
| D9 scope only in `packages/powers` | BR-23; registration in root — a deferred dependency |

## Deferred decisions (CAT-D) → SR/AC

| ID | Question | State | SR/AC |
|---|---|---|---|
| CAT-D1 | Project layer of instructions | v1 canonical | — |
| CAT-D2 | Semantic `decision.evaluate` | v1 deterministic | SR-16…SR-21, AC-10…AC-12 |
| CAT-D3 | Digest binding of instructions | decided: digest in `catalog.json` | SR-76, AC-42 |
| CAT-D4 | Language of instructions | v1 — product language | — |
| CAT-D5 | Catalog hierarchy | v1 — flat | — |
| CAT-D6 | CRAP/mutation gate for VP | deferred (a new dependency) | — |
| CAT-D7 | Corpus navigation | bundle index | SR-73 |
| CAT-D8 | Approval of the tag vocabulary | owner, in a batch pass | — |
| CAT-D9 | Scope of the MVP corpus | stage D (exit criteria) | — |
| CAT-D10 | Selection report | in the processing map | SR-66 |

## Coverage

Each section of research §1–§14 has at least one row; the normative clauses of the
S-specification have a binding to BR and AC. Clauses without a separate automated test — configuration, schema, runtime request or
semantic check: their verification is closed by the gates of the respective stage
(Stage 2/4/5/7) or by human review (AC with the type `manual`).

**S-specification clauses without a separate AC** (verified programmatically): SR-02, SR-08, SR-09,
SR-17, SR-19, SR-27, SR-32, SR-34, SR-35, SR-36, SR-39, SR-40, SR-42, SR-44, SR-46, SR-47,
SR-48, SR-49, SR-50, SR-51, SR-52, SR-55, SR-60, SR-61, SR-64, SR-65. Reason: these are rules
of configuration, schemas, runtime requests or semantic conditions that are closed by the gates
of stages Stage 2/4/5/7 or by human review, not by an automated test.

**S-specification clauses without a separate AC** (verified programmatically): SR-02, SR-08, SR-09,
SR-17, SR-19, SR-27, SR-32, SR-34, SR-35, SR-36, SR-39, SR-40, SR-42, SR-44, SR-46, SR-47,
SR-48, SR-49, SR-50, SR-51, SR-52, SR-55, SR-60, SR-61, SR-64, SR-65. Reason: these are rules
of configuration, schemas, runtime requests or semantic conditions that are closed by the gates
of stages Stage 2/4/5/7 or by human review, not by an automated test.

**S-specification clauses without a separate AC** (verified programmatically): SR-02, SR-08, SR-09,
SR-17, SR-19, SR-27, SR-32, SR-34, SR-35, SR-36, SR-39, SR-40, SR-42, SR-44, SR-46, SR-47,
SR-48, SR-49, SR-50, SR-51, SR-52, SR-55, SR-60, SR-61, SR-64, SR-65. Reason: these are rules
of configuration, schemas, runtime requests or semantic conditions that are closed by the gates
of stages Stage 2/4/5/7 or by human review, not by an automated test.

**S-specification clauses without a separate AC** (verified programmatically): SR-02, SR-08, SR-09,
SR-17, SR-19, SR-27, SR-32, SR-34, SR-35, SR-36, SR-39, SR-40, SR-42, SR-44, SR-46, SR-47,
SR-48, SR-49, SR-50, SR-51, SR-52, SR-55, SR-60, SR-61, SR-64, SR-65. Reason: these are rules
of configuration, schemas, runtime requests or semantic conditions that are closed by the gates
of stages Stage 2/4/5/7 or by human review, not by an automated test.

**S-specification clauses without a separate AC** (verified programmatically): SR-02, SR-08, SR-09,
SR-17, SR-19, SR-27, SR-32, SR-34, SR-35, SR-36, SR-39, SR-40, SR-42, SR-44, SR-46, SR-47,
SR-48, SR-49, SR-50, SR-51, SR-52, SR-55, SR-60, SR-61, SR-64, SR-65. Reason: these are rules
of configuration, schemas, runtime requests or semantic conditions that are closed by the gates
of stages Stage 2/4/5/7 or by human review, not by an automated test.

**Open coverage gaps:** runtime acceptance (AC gap), qualification on
hosts other than Codex (AC-27, gap), marketplace installation (gap), a legal opinion
on licenses (gap).
