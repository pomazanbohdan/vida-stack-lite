---
type: Decision
title: 'D30 - Habit-loop tags for the H1 hooked-ux batch'
description: 'One capability and six pattern tags with catalog definitions let the Hook Model and its ethics boundaries carry accurate metadata.'
status: stable
stale_after: '2027-11-04T00:00:00Z'
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

# D30 — Habit-loop tags for the H1 hooked-ux batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `hooked-ux`. The Hook Model defines a
four-phase habit loop, variable rewards, internal triggers, an ethics matrix and
onboarding completion. The existing product and business patterns describe
messages, persuasion and interfaces, not habit formation or its ethical limits.

## Decision

Add one capability and six pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-habit-loop` | Ability to design a four-phase habit loop from trigger to investment. |
| pattern | `habit-loop` | An approach in which a trigger, an action, a variable reward and an investment form a repeating cycle. |
| pattern | `variable-reward` | An approach in which an uncertain reward sustains anticipation across repeat use. |
| pattern | `internal-trigger` | An approach in which an external cue is replaced by an internal emotional trigger over time. |
| pattern | `habit-ethics` | An approach in which habit-forming design is checked against user benefit, vulnerable users and manipulation. |
| pattern | `onboarding-hook` | An approach in which the first cycle is completed during onboarding: trigger, action, reward and investment. |
| pattern | `friction-reduction` | An approach in which the simplest action is made easier by removing steps and choices. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`hooked-ux` uses `design-habit-loop` with `habit-loop` for the overview, core
loop and investment; `internal-trigger` for the trigger phase;
`friction-reduction` for the action phase; `variable-reward` for the reward
phase; `habit-ethics` for the manipulation matrix and when-not-to-use;
`regulatory-watch` for the regulatory rules; `onboarding-hook` for the five
onboarding stages; and the existing `scoring-rubric`, `metric-gated-decision`,
`mistake-list` and `diagnostic-questions` for the scored, measured and checklist
rules.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the seven tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
