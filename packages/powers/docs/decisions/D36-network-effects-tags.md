---
type: Decision
title: 'D36 - Network-effects tags for the H1 cold-start-problem batch'
description: 'One capability and six pattern tags with catalog definitions let atomic networks, hard side, tipping, ceilings and moats carry accurate metadata.'
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

# D36 — Network-effects tags for the H1 cold-start-problem batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `cold-start-problem`. The source
defines atomic networks, the hard side, network tipping, ceilings, moats and the
acquisition/engagement/economic effects. Existing business patterns describe
funnels, markets and growth, not the cold-start mechanics of a networked
product.

## Decision

Add one capability and six pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-network-effects` | Ability to design a networked product from one atomic network to a defended network. |
| pattern | `atomic-network` | An approach in which the first network is small, complete and self-sustaining. |
| pattern | `hard-side` | An approach in which the side that is hardest to acquire is solved first. |
| pattern | `network-tipping` | An approach in which a repeatable playbook tips one network after another. |
| pattern | `network-ceiling` | An approach in which growth stalls are met by starting a new network or extending the moat. |
| pattern | `network-moat` | An approach in which density and switching costs create a durable defense. |
| pattern | `network-growth-loop` | An approach in which acquisition, engagement and economic network effects reinforce each other. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`cold-start-problem` uses `design-network-effects` with the six patterns for its
framework; the score, mistake-list and diagnostic instructions carry pattern
tags only with explicit capability exemptions. Already-applied files keep their
existing metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the seven tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
