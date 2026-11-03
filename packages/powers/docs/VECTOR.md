---
type: Concept
title: Vida Powers — instruction change vector
description: 'Living multi-direction summary of instruction and documentation changes, with the change authority matrix and the donor batch table.'
status: stable
stale_after: '2027-11-02T00:00:00Z'
tags:
- vida-powers
- donor-updates
- instruction-quality
- vector
sources:
- id: log
  resource: /log.md
  title: Bundle update log
- id: next-actions
  resource: /next-actions.md
  title: Current Powers task list
- id: acceptance
  resource: /acceptance.md
  title: Acceptance criteria
- id: d12
  resource: /decisions/D12-declared-conflicts.md
  title: D12 — Opposing instructions are declared, not narrowed away
- id: profile
  resource: /../config/methodology-profile.json
  title: Methodology profile groups and defaults
generated: { by: human:repository-owner, at: '2026-11-02T16:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-02T16:00:00Z' }
revision: '13'
---

# Instruction change vector

This is the living summary of how donor updates change the instruction corpus.
It records direction and authority, not the full batch evidence. The batch entry
in `/log.md` and the donor baseline remain the evidence owners.

## Current vector

The global synthesis: instructions move from descriptive prose to an executable
contract.

- **Context before questions** — read the available material, then ask only the gap.
- **Ticket-first requirements** — read the initiative or epic first and treat its Requirements as settled.
- **Evidence-bound review** — the ticket's Requirements define intent, findings and verdicts live in a triage file, and a verification gap names the test that would catch it.
- **Explicit decisions** — approaches, design doc, approval gate before build.
- **Progressive disclosure** — short `SKILL.md` routes to `references/`.
- **Compaction-safe state** — ledger, wiki or reference, not session memory.
- **Human-attributed reports** — named filer and human summary.
- **Short user communication** — Outcome, Evidence, Decision/GAP, Next.
- **Gradual automation** — triggers, throttles, review brakes, loop caps.
- **Tracked updates** — provenance, map, baseline, renames and deletions.

## Direction vectors

| Direction | Current movement | Evidence | Derived / auto boundary | Owner decision |
|---|---|---|---|---|
| Engineering | Fresh context per subagent; four verification-gap shapes; file-backed triage; small batches; reference detail | superpowers, matt-skills, bmad-method | DERIVED after review: provenance, catalog/map/baseline; AUTO: links and counts | none for mechanical; review for semantic |
| Product / design | Context first; explicit approaches; design gate; ticket-aware handoff | superpowers, bmad-method | DERIVED after review: provenance, catalog/map; AUTO: links and counts | product policy for `user_decision: false` groups; no default for `user_decision: true`; scope and priority |
| Operations | Wiki memory; gradual automation; loop caps | matt-skills | DERIVED after review: provenance, catalog/map; AUTO: links and counts | operational policy, automation rollout |
| Documentation | Short contract; OKF/D6; conflict precedence; progressive disclosure | both batches | AUTO: broken local links, heading/count drift, log/vector rows | canonical scope, acceptance text |
| Communication | Outcome / Evidence / Decision / Next; less description for user messages only | adaptive-reporting | none | channel policy, formal standard |

A batch may touch several directions. The batch table adds `Direction` after
`Result`.

## Change authority

| Class | May change without a new owner decision | Examples |
|---|---|---|
| **AUTO** | Yes, when the edit preserves meaning and is deterministic | broken local link; heading/count drift in a derived summary; log/vector row; formatting; typo that does not change meaning |
| **DERIVED** | Yes, only after the source change is already authorized | catalog digest; map entry; baseline; NOTICE pin; corpus/map/baseline counts; provenance revision/path only when the source exists at the new pin and the content hash is unchanged |
| **REVIEW** | No; needs independent or human review | instruction body change that alters meaning, scope, conditions, strength, negation or examples; new/merged instruction; tag/domain/classification change; acceptance or contract text; new opposing pair; profile group change |
| **OWNER** | No; decision owner only | source admission; legal; business scope or priority; publication; default selection for `user_decision: true`; deletion of canonical content; product boundary |
| **BLOCKED** | No; missing evidence or unresolved conflict | unknown effect; stale hash; conflicting instructions without a declared pair; no attributable decision |

AUTO never decides meaning. DERIVED is not an independent authorization; it
mirrors a change that REVIEW or OWNER already approved. A source path or revision
change is DERIVED only when the source file exists at the new pin and the content
hash is unchanged; otherwise it is REVIEW or BLOCKED. Canonical deletion is
OWNER, not REVIEW.

## Opposing instructions and defaults

No new default mechanism is added. The existing owners decide:

- **D12** declares opposing pairs. Each side names the other in
  `compatibility_excludes`; both texts stay; the catalogue reports the pair.
- **`methodology-profile.json`** owns policy groups:
  - `user_decision: false` with `default` — the default applies; record it.
  - `user_decision: true` — no default; the user chooses at setup. The decision
    owner resolves only an attributable exception. Dependent work blocks while
    the choice is open.
- **Duplicate** — merge into one canonical owner; not a default.
- **Stale or superseded** — mark deprecated/disabled; not a default.
- **Project-specific preference** — record as a profile selection and project
  decision; not as a corpus-wide default.
- **Unresolved opposition outside a profile group** — declare the pair; block
  the dependent composition; do not silently pick.

No batch, model or repair may invent a default. An owner decision is not a
product-owner default and cannot override `user_decision: true`.

## Batch log

| Batch | Donor | Pin | Existing instructions | Content updates | New instructions | Rejected / removed | Result | Direction |
|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | superpowers | `bb92a77741419a4ab5f06e711a283343f1ada0c3` → `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 87 | 8 | 2 | 18 deleted; 2 rejected; 1 duplicate removed | 2,512 / 2,782 / 1,201 | product/design; engineering; documentation |
| 2 | matt-skills | `49dd158d1076134a641b33efb035946536778336` → `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | 69 | 8 | 2 | 16 deleted; 9 rejected | 2,514 / 2,776 / 1,202 | engineering; operations; documentation |
| 3 | bmad-method | `cfba3ff5f982c1809e060606e399f55ebd7bce5e` → `bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41` | 752 | 96 | 10 | 16 deleted used files; 18 new candidates reviewed | 2,524 / 2,777 / 1,200 | product/design; engineering; operations; documentation |
| 4 | addy-skills | `aeac41d4d005999432bb7312f7ff06383a91d59d` → `301b02b12bff98e4688e6984af6556802322bbde` | 392 | 10 | 0 | 14 eval files rejected | 2,524 / 2,791 / 1,200 | engineering; documentation |
| 5 | gsd-core | `19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005` → `bfab82492374a847a01417707a1a38e9e7cf097e` | 1,343 | 6 | 5 | 25 new candidates; 212 packaging/translation docs rejected; 22 stale map records removed | 2,529 / 3,008 / 1,202 | engineering; operations; documentation |
| 6 | wondelai-skills | `c172996495bed0fcd26896a9416b2093fd7073f0` | 0 | 0 | 253 | engineering subset + 13 product/design and business files; 30 journey excluded; 157 candidates pending H1 selection | 2,782 / 3,429 / 1,223 | engineering; product/design; business |

Legend: result = corpus instructions / map records / baseline files.

## Staged batches

| Stage | Donor | Scope | Content updates | Status |
|---|---|---|---:|---|
| B1 | bmad-method | `bmad-prd` + `bmad-qa-generate-e2e-tests` ticket awareness | 6 | folded into batch 3 |
| B2 | bmad-method | `bmad-architecture` + `bmad-ux` ticket-first | 10 | folded into batch 3 |
| B3 | bmad-method | `bmad-spec` reviewed against the new ticket owner | 2 | folded into batch 3; 17 repoints applied |
| B4 | bmad-method | `bmad-code-review` + `bmad-review` ticket and triage rules | 24 | folded into batch 3 |
| B5 | bmad-method | `bmad-ticket` reviewed against the new `bmad-agent-po` owner | 6 | folded into batch 3; 56 source repoints applied |
| B6 | bmad-method | `bmad-build` + `bmad-build-auto` ticket context and verification | 8 | folded into batch 3 |
| B7 | bmad-method | `bmad-retrospective` + `bmad-correct-course` + `bmad-project-context` | 12 | folded into batch 3; 9 correct-course repoints applied |
| B8 | bmad-method | `bmad-walkthrough` + `bmad-prfaq` + `bmad-forge-idea` | 12 | folded into batch 3 |
| B9 | bmad-method | `bmad-agent-*`, `bmad-toolsmith`, `bmad-deep-recon`, `bmad-product-brief`, method help | 16 | folded into batch 3 |
| B10 | bmad-method | new `bmad-agent-po` workflow, ticket, spec and slice rules | 10 new | folded into batch 3 |

The bmad-method B1–B10 content batches are folded into batch 3; no staged batch remains.
A staged batch changed instruction content before the pin and provenance advanced.
It was not a completed batch and made no admission claim.

## Applied provenance moves

The moves below were applied in batch 3.

| From | To | Reason |
|---|---|---|
| `skills/bmad-spec/SKILL.md` | `skills/bmad-agent-po/references/spec.md` | bmad-spec removed; Sofia owns ticket requirements |
| `skills/bmad-spec/assets/spec-template.md` | `skills/bmad-agent-po/references/spec.md` | template replaced by the ticket template |
| `skills/bmad-spec/assets/headless-schemas.md` | `skills/bmad-agent-po/references/spec.md` | headless requirements now live in the ticket workflow |
| `skills/bmad-ticket/**` | `skills/bmad-agent-po/**` (same relative path) | bmad-ticket removed; Sofia owns the ticket workflow |
| `skills/bmad-ticket/assets/{initiative,epic,story}-template.md` | `skills/bmad-agent-po/assets/ticket-template.md` | three container templates merged into one |
| `skills/bmad-ticket/customize.toml` | `skills/bmad-agent-po/customize.toml` | customization moved with the skill |
| `skills/bmad-correct-course/**` | `skills/bmad-agent-po/references/replan.md` | correct-course removed; replan owns the change path |

## Batch update rule

After every donor batch or repair review:

1. Add one row to the batch table with the donor, pin, counts, result and direction.
2. Update the direction vectors only when the direction changed; do not rewrite history.
3. Keep open work in `next-actions.md`, acceptance state in `acceptance.md` and completed history in `log.md`.
4. Run `bun packages/powers/scripts/check-vector.ts` before commit.

The check fails when a processed donor pin or the latest corpus, map or baseline
count is stale. This file records authority, not the status of individual
findings; no second ledger is created.
