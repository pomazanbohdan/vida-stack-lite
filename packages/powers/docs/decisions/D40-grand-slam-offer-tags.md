---
type: Decision
title: 'D40 - Grand Slam Offer tags for the H1 hundred-million-offers batch'
description: 'One capability and eight pattern tags with catalog definitions let the offer lever, value equation, starving crowd, value pricing, bonuses, guarantees, ethical scarcity, MAGIC naming and the ten-step offer sequence carry accurate metadata.'
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

# D40 — Grand Slam Offer tags for the H1 hundred-million-offers batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `hundred-million-offers`. The source
treats the offer as the primary business lever and builds it from the Value
Equation, a starving crowd, value-based pricing, objection-killing bonuses,
risk-reversing guarantees, ethical scarcity, MAGIC naming and a ten-step
creation sequence. Existing `value-equation` and `risk-reversal` tags from D38
cover two levers; the remaining offer vocabulary is new.

## Decision

Add one capability and eight pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-grand-slam-offer` | Ability to assemble an offer with value, bonuses, guarantee, scarcity and a name. |
| pattern | `grand-slam-offer` | An approach in which core offer, bonuses, guarantee, scarcity and name form one complete package. |
| pattern | `starving-crowd` | An approach in which a market is chosen for pain, purchasing power, targetability and growth before the offer is built. |
| pattern | `value-based-pricing` | An approach in which price is set from delivered value rather than cost. |
| pattern | `bonus-stacking` | An approach in which each bonus answers one objection and carries an honest standalone value. |
| pattern | `ethical-scarcity` | An approach in which quantity and time limits are used only when they are real. |
| pattern | `magic-name` | An approach in which the offer name states avatar, goal, timeframe and container. |
| pattern | `trim-and-stack` | An approach in which low-value high-cost components are cut and high-value low-cost ones stacked. |
| pattern | `offer-creation-sequence` | An approach in which crowd, outcome, obstacles, solutions, trim, price, bonuses, guarantee, scarcity and name are worked in order. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`hundred-million-offers` uses `design-grand-slam-offer` with these patterns and
the existing `value-equation` and `risk-reversal`. The score, common-mistakes
and quick-diagnostic instructions carry pattern tags only, with explicit
capability exemptions. The source's ambiguous score bands 4 and 7-8, the
"eight sections" wording against ten enumerated steps, and the 10:1 aim against
the 10:1 to 5:1 process range are preserved as source statements, not
reconciled by invention.

## Consequences

`catalog.json` revision advances by the nine tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
