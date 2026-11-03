---
type: Decision
title: 'D21 - Organization design tags for the H1 team-topologies batch'
description: 'One capability and two pattern tags with catalog definitions let team-topologies carry accurate metadata instead of reusing code-structure tags.'
status: stable
stale_after: '2027-11-03T00:00:00Z'
tags:
- vida-powers
- engineering
- pattern-tags
- decision
sources:
- id: system-specification
  resource: /system-specification.md
  title: Vida Powers system specification
- id: d18
  resource: /decisions/D18-blind-three-protocol-source-review.md
  title: D18 - Blind three-protocol panel
- id: d20
  resource: /decisions/D20-business-pattern-tags.md
  title: D20 - Business pattern tags for the H1 pilot
---

# D21 — Organization design tags for the H1 team-topologies batch

Date: 2026-11-03
Status: accepted

## Context

The H1 source-admission panel is applying `team-topologies` from the Wondelai
donor. D18 plan review checks every tag against its definition in
`catalog.tag_dictionary`. The existing `design-structure` capability and
`structural-design` pattern describe code structure and module boundaries; they
do not describe organizational design, team interaction modes or an internal
platform product. Reusing them produced an Important review finding.

The catalog had no accurate capability or pattern for this domain.

## Decision

Add one capability and two pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-team-organization` | Ability to choose team boundaries, team types and interaction modes before assigning work. |
| pattern | `team-topology-design` | An approach in which team boundaries, team types and interaction modes are designed deliberately so the organization produces the intended architecture. |
| pattern | `internal-platform-product` | An approach in which an internal platform is run as a product for its stream-aligned customers: optional adoption, cognitive load removed as the measure, and sensing signals. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

The `team-topologies` batch uses `design-team-organization` with
`team-topology-design` for the core principle, inverse Conway maneuver, team
types, interaction modes, cognitive load, fracture planes and common mistakes;
`internal-platform-product` for platform-as-a-product; and the existing
`scoring-rubric`, `mistake-list` and `diagnostic-questions` for the scoring,
mistake and diagnostic instructions. Already-applied files keep their existing
metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the three tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
