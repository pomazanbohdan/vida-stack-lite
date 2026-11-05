---
type: Decision
title: 'D52 - Microinteraction tags for the H2 microinteractions batch'
description: 'One capability and six pattern tags with catalog definitions let trigger states, predictable rules, response timing, loop and mode behavior, signature moments and simplification carry accurate metadata.'
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

# D52 — Microinteraction tags for the H2 microinteractions batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `microinteractions`. The source
designs contained product moments through Dan Saffer's four parts: trigger,
rules, feedback, and loops and modes, with signature moments and simplification
as separate design concerns. The catalog already has the
`microinteraction-feedback` pattern from D43, which describes the four-part
structure as a whole; it does not distinguish the per-part decisions this batch
makes.

## Decision

Add one capability and six pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-microinteraction` | Ability to design and audit a frequent product interaction's trigger, rules, feedback and loop. |
| pattern | `trigger-state` | An approach in which a trigger signals its existence, action and current state, with a visible alternative for hidden gestures. |
| pattern | `predictable-rules` | An approach in which interaction rules derive from the goal, match conventions and cover inputs and edge cases. |
| pattern | `response-timing` | An approach in which direct-manipulation feedback arrives within 100ms and scales to event significance. |
| pattern | `loop-mode` | An approach in which loops mature over time and modes are minimized and kept visible. |
| pattern | `signature-moment` | An approach in which one or two frequent actions carry a distinctive, functional brand moment. |
| pattern | `interaction-simplification` | An approach in which options, steps and rules are reduced until the interaction needs no instructions. |

The existing `microinteraction-feedback` pattern is reused unchanged for the
core four-part instruction. D52 does not redefine it.

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`microinteractions` uses `design-microinteraction` with `microinteraction-feedback`
for the core instruction and the six new patterns for the trigger, rules,
feedback, loop/mode, signature-moment and simplification instructions. The
score, common-mistakes and quick-diagnostic instructions carry pattern tags
only, with capability exemptions. This is H2 source admission; structured
applicability under the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the seven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
