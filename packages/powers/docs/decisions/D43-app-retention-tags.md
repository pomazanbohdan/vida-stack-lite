---
type: Decision
title: 'D43 - App-retention tags for the H1 grow-app batch'
description: 'One capability and seven pattern tags with catalog definitions let the retention-first sequence, opportunity tree, outcome-over-output, empowered team, stickiness stage, microinteraction feedback and Manipulation Matrix carry accurate metadata.'
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

# D43 — App-retention tags for the H1 grow-app batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `grow-app`. The source seals an app's
retention engine across eight phases: habit loop, activation, discovery,
experiments, empowered team, one metric, microinteractions and intrinsic
motivation. Existing tags cover habit loops, friction, experiments, metrics and
motivation individually; the retention-first sequence and its ethical checks are
new.

## Decision

Add one capability and seven pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-retention-engine` | Ability to turn signups into habitual users by fixing habit, activation and retention before acquisition. |
| pattern | `retention-before-acquisition` | An approach in which acquisition stays locked until activation and retention clear a pre-set bar. |
| pattern | `opportunity-tree` | An approach in which outcomes branch into customer opportunities before candidate solutions. |
| pattern | `outcome-over-output` | An approach in which success is a behavior change rather than a shipped deliverable. |
| pattern | `empowered-product-team` | An approach in which a team owns problems and outcomes instead of a feature backlog. |
| pattern | `stickiness-stage` | An approach in which retention is the OMTM while retention is weak. |
| pattern | `microinteraction-feedback` | An approach in which trigger, rules, feedback and loops are specified for each frequent interaction. |
| pattern | `manipulation-matrix` | An approach in which a habit feature is checked against maker use, user benefit and honest belief. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`grow-app` uses `design-retention-engine` with these patterns and the existing
`resumable-journey`, `phase-gate`, `habit-loop`, `starter-step`,
`experiment-precommit`, `one-metric` and `intrinsic-motivation`. The
common-mistakes instruction carries a pattern tag only, with a capability
exemption; the journey-map, optional-phases and complete instructions carry
pattern exemptions. Already-applied files keep their existing metadata; no
retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the eight tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
