---
type: Decision
title: 'D44 - Growth-engine tags for the H1 grow-business batch'
description: 'One capability and two pattern tags with catalog definitions let the ordered growth-engine sequence and the scored marketing machine carry accurate metadata.'
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

# D44 — Growth-engine tags for the H1 grow-business batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `grow-business`. The source turns
lumpy revenue into a repeatable engine across nine ordered phases, each
producing an asset the next consumes. Existing tags cover offers, outbound,
pipeline math, word-of-mouth, persuasion, beachheads, referrals, metrics and
negotiation. The engine sequence and the scored marketing machine are new.

## Decision

Add one capability and two pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `build-growth-engine` | Ability to turn lumpy revenue into a repeatable growth engine with ordered assets. |
| pattern | `growth-engine-sequence` | An approach in which each growth phase produces an asset the next phase consumes. |
| pattern | `marketing-machine` | An approach in which the full marketing process is mapped as a scored grid before tactics. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`grow-business` uses `build-growth-engine` with these patterns:
`growth-engine-sequence`, `marketing-machine`, `resumable-journey`,
`grand-slam-offer`, `pipeline-math`, `word-of-mouth-shareability`,
`persuasion-principle`, `beachhead-segment`, `atomic-network`, `one-metric`,
`ackerman-bargaining`, `accusation-audit` and `mistake-list`. The
common-mistakes instruction carries a pattern tag only, with a capability
exemption; the optional-phases, phases and closure instructions carry pattern
exemptions. Already-applied files keep their existing metadata; no retroactive
retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the three tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
