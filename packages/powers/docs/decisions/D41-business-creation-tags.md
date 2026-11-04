---
type: Decision
title: 'D41 - Business-creation tags for the H1 create-business batch'
description: 'One capability and nine pattern tags with catalog definitions let the validation sequence, job statement, interview evidence, design sprint, MVP, strategy kernel, blue-ocean grid, positioning and beachhead carry accurate metadata.'
status: stable
stale_after: '2027-11-04T00:00:00Z'
tags:
- vida-powers
- business
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

# D41 — Business-creation tags for the H1 create-business batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `create-business`. The source runs ten
phases from a raw idea to a validated, positioned, priced business: job
reconstruction, interview evidence, a design sprint, an MVP, a strategy kernel,
uncontested space, positioning, an offer, willingness-to-pay pricing and a
beachhead. Existing journey, gate, offer, WTP and price-metric tags cover parts;
the remaining business-creation vocabulary is new.

## Decision

Add one capability and nine pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `build-validated-business` | Ability to take a raw idea to a validated, positioned and priced business. |
| pattern | `business-creation-sequence` | An approach in which demand, strategy and price are validated in that order before building or scaling. |
| pattern | `job-to-be-done` | An approach in which the idea is reframed as progress a customer seeks in a situation. |
| pattern | `customer-interview-evidence` | An approach in which past-behavior interviews and real commitments replace opinions and compliments. |
| pattern | `design-sprint-test` | An approach in which the riskiest assumption is tested in five days with five target customers. |
| pattern | `minimum-viable-product` | An approach in which the smallest build tests the riskiest leap-of-faith assumption. |
| pattern | `strategy-kernel` | An approach in which a diagnosis, guiding policy and coherent actions replace goals. |
| pattern | `blue-ocean-err` | An approach in which an ERRC grid and strategy canvas create uncontested space. |
| pattern | `market-positioning` | An approach in which alternatives, attributes, value, customer and category set the comparison context. |
| pattern | `beachhead-segment` | An approach in which one narrow segment is chosen to dominate before expansion. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`create-business` uses `build-validated-business` with these patterns and the
existing `resumable-journey`, `phase-gate`, `grand-slam-offer`, `wtp-research`
and `price-metric`. The common-mistakes instruction carries a pattern tag only,
with an explicit capability exemption. Already-applied files keep their existing
metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the ten tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
