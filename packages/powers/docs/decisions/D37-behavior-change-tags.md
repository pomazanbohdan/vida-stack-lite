---
type: Decision
title: 'D37 - Behavior-change tags for the H1 improve-retention batch'
description: 'One capability and ten pattern tags with catalog definitions let B=MAP, the Action Line, the Ability Chain, prompts, tiny habits and retention diagnostics carry accurate metadata.'
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

# D37 — Behavior-change tags for the H1 improve-retention batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `improve-retention`. The source
defines the Fogg Behavior Model (B=MAP), the Action Line, the six-factor Ability
Chain, prompt timing, the Tiny Habits recipe, Starter Steps, Focus Mapping, a
five-step behavior-design sequence and a retention diagnostic table. Existing
tags describe habit loops, intrinsic motivation, onboarding and friction, but
not the B=MAP vocabulary or its retention diagnostics.

## Decision

Add one capability and ten pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-behavior-change` | Ability to design a behavior change that survives low motivation by shifting ability, prompt and celebration. |
| pattern | `bmap-model` | An approach in which behavior occurs only when motivation, ability and a prompt converge at the same moment. |
| pattern | `action-line` | An approach in which a threshold separates behavior that occurs from behavior that does not. |
| pattern | `ability-chain` | An approach in which the scarcest of six ability factors is found and fixed. |
| pattern | `prompt-timing` | An approach in which prompts are sent only above the action line and tied to events or routines. |
| pattern | `motivation-wave` | An approach in which design targets low-motivation troughs rather than motivation spikes. |
| pattern | `tiny-habit-recipe` | An approach in which a tiny behavior is anchored to a routine and followed by immediate celebration. |
| pattern | `starter-step` | An approach in which a target behavior is shrunk to its tiniest meaningful version. |
| pattern | `focus-mapping` | An approach in which candidate behaviors are plotted by impact against feasibility. |
| pattern | `behavior-design-steps` | An approach in which aspiration, options, matching, tiny start and optimization are worked in order. |
| pattern | `retention-diagnostic` | An approach in which a retention metric is mapped to a behavior-model cause and action. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`improve-retention` uses `design-behavior-change` with the behavior patterns.
The score, common-mistakes and quick-diagnostic instructions carry pattern tags
only, with explicit capability exemptions. Already-applied files keep their
existing metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the eleven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
