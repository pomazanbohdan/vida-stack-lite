---
type: Decision
title: 'D53 - Product design review tags for the H2 steve-jobs-design-review batch'
description: 'One capability and nine pattern tags with catalog definitions let customer-first framing, subtractive simplicity, focus, behavioral design, whole-journey ownership, demo-driven review, back-of-fence quality and binary verdicts carry accurate metadata.'
status: stable
stale_after: '2027-11-05T00:00:00Z'
tags:
- vida-powers
- product
- pattern-tags
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
---

# D53 — Product design review tags for the H2 steve-jobs-design-review batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `steve-jobs-design-review`. The source
runs product reviews from the customer experience, subtracts until only the
essential remains, focuses by saying no, judges behavior rather than appearance,
owns every touchpoint, requires working demos, holds unseen surfaces to the same
standard, and ends with a binary verdict. Existing review tags (`code-review`,
`adversarial-self-review`) describe engineering changes, not product design
reviews.

## Decision

Add one capability and nine pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `review-product-design` | Ability to judge a product's design against customer experience, simplicity, focus and end-to-end quality. |
| pattern | `design-review-method` | An approach in which a product review follows a fixed order from cold experience to a binary verdict. |
| pattern | `experience-backwards` | An approach in which the review starts from what the customer sees and works backwards to the technology. |
| pattern | `subtractive-simplicity` | An approach in which complexity is conquered by removing elements until one more removal would break the purpose. |
| pattern | `ruthless-focus` | An approach in which the work not done is chosen explicitly and the roadmap is cut to the few bets that matter. |
| pattern | `behavioral-design` | An approach in which design is judged by flows, latency and failure states rather than static appearance. |
| pattern | `end-to-end-ownership` | An approach in which every touchpoint from discovery to offboarding is treated as one product surface. |
| pattern | `demo-driven-review` | An approach in which decisions are made from working demos on the target device, not from specs or slides. |
| pattern | `back-of-fence-standard` | An approach in which unseen surfaces are held to the same quality bar as the demo path. |
| pattern | `binary-design-verdict` | An approach in which a review ends with insanely great or not done, plus a ranked cut and fix list. |

The existing `customer-experience` pattern covers post-purchase touchpoints and
is not redefined; `end-to-end-ownership` is the broader whole-journey standard.
The tags are metadata only and do not admit any source; D18 review remains
required for every file.

## Application

`steve-jobs-design-review` uses `review-product-design` with these patterns.
The score, common-mistakes and quick-diagnostic instructions carry pattern tags
only (`scoring-rubric`, `mistake-list`, `diagnostic-questions`), with capability
exemptions. This is H2 source admission; structured applicability under the H2
v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the ten tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
