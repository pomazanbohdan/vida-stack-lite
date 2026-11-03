---
type: Decision
title: 'D18 — Blind three-protocol panel for H1 source review and admission'
description: 'The H1 25-file review and admission use three blind Codex Luna agents and an orchestrator aggregation instead of a human review loop.'
status: stable
stale_after: '2027-11-03T00:00:00Z'
tags:
- vida-powers
- source-review
- admission
- decision
sources:
- id: business-requirements
  resource: /business-requirements.md
  title: Vida Powers business requirements
- id: d14
  resource: /decisions/D14-bounded-engineering-ux-guidance.md
  title: D14 — Bounded engineering, UX, product and business guidance
- id: d17
  resource: /decisions/D17-source-attribution-boundary.md
  title: D17 — Source attribution boundary
- id: step-h
  resource: /task-plan-step-h.md
  title: Step H source-admission plan
generated: { by: human:repository-owner, at: '2026-11-03T00:00:00Z' }
verified: { by: human:repository-owner, at: '2026-11-03T00:00:00Z' }
revision: '1'
---

# Decision

## Accepted choice

On 2026-11-03 the repository owner directed that, for the H1 Wondelai 25-file
pilot, the human fidelity review and owner admission loop is replaced by three
blind review agents plus an orchestrator aggregation.

The three agents use the top three protocols from the H1 review-algorithm
evaluation:

1. **V3 Delphi two-round** — 4.10, primary condition-preservation review.
2. **V2 Adversarial triad** — 3.90, challenge pass for dropped, weakened or
   invented rules.
3. **V4 Round-robin party chat** — 3.90, duplicate and ethical-boundary scan.

Each agent is a Codex Luna model launched through T3 `delegate_task`. Each agent
works independently and does not see the other two outputs.

## Aggregation

The orchestrator collects the three per-unit decision sets, records every
agreement and disagreement, resolves disagreements by citing the exact source
line, and produces the final reviewed decisions and admission record for the
exact subset.

The aggregation is the admission decision for H1. No separate human fidelity
review or owner ratification is required for this pilot.

## Scope and boundaries

- Applies only to the H1 25-file Wondelai pilot. H2, H3 and other product
  decisions require a separate owner decision.
- The panel cannot admit content outside the owner-approved 25-file set or the
  421/30/391 carrier accounting.
- Every admitted unit still needs source attribution: donor, path, revision,
  license, SHA-256 and locator. D17 remains binding.
- Powers does not assess legal risk; a license label is not legal clearance.
- The final decisions must pass `checkDecomposition` and retain exact source
  hashes and locators.
- The panel is model-based. This decision deliberately replaces the human loop
  for H1 and must be recorded as delegated model review, never described as
  human fidelity.

## Implementation boundary

The current `scripts/source-packets.ts` admission API validates
`VPHumanSourceGate/v1` records with `human:` actors. This decision authorizes a
delegated gate path for model/panel admission. Until that path is implemented,
tested and reviewed, the panel review can be recorded as H1 review evidence,
but a source packet cannot become `eligible` for corpus publication.

## Evidence

- `packages/powers/.tmp/donor-updates/consilium-eval/REPORT.md` — algorithm
  evaluation and top three.
- `packages/powers/.tmp/donor-updates/consilium-eval/judge/T3-REPORT.md` —
  blind judge score matrix and ranking.
- `packages/powers/.tmp/donor-updates/consilium-eval/reports-codex/v3-delphi.md`,
  `v2-adversarial-triad.md`, `v4-party-chat.md` — the three selected protocol
  outputs on the sample.
- The 25-file panel outputs and the aggregation manifest will be recorded under
  the existing H1 evidence directory.

## Rationale

The owner wants the H1 review to run without a human loop. The three selected
protocols cover complementary failure modes: Delphi for condition preservation,
adversarial review for dropped or overstated rules, and party chat for duplicate
and ethical-boundary detection. Aggregation resolves disagreements with source
evidence and keeps the decision auditable.

V1 and V5 were excluded: V1 acknowledged missed norms without incorporating
them, and V5 rejected explicit scoring procedures and dropped the weekly
trio benchmark. V4 is used as a fast scan because it has the best
signal-to-output ratio, not as the sole reviewer.

## Consequences

- H1 no longer waits for a named human fidelity review or owner admission.
- The panel's output is model evidence; it is not human fidelity and must not be
  labeled as such.
- A delegated gate implementation is required before publication.
- The owner can revoke or narrow this decision in writing.
