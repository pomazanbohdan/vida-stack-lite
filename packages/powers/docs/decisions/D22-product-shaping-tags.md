---
type: Decision
title: 'D22 - Product shaping tags for the H1 37signals-way batch'
description: 'One capability and two pattern tags with catalog definitions let 37signals-way carry accurate shaping, fixed-time and opinionated-default metadata.'
status: stable
stale_after: '2027-11-03T00:00:00Z'
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
- id: d21
  resource: /decisions/D21-organization-design-tags.md
  title: D21 - Organization design tags
---

# D22 — Product shaping tags for the H1 37signals-way batch

Date: 2026-11-03
Status: accepted

## Context

The H1 source-admission panel is applying `37signals-way` from the Wondelai
donor. The source describes shaping a product problem into a bounded pitch,
betting it into a fixed six-week cycle with variable scope, small autonomous
teams, and product-chosen defaults instead of user preferences. The existing
catalog had no capability or pattern for shaping or fixed-time product work;
`design-structure` and `code-minimization` describe code, and
`design-system-adherence` describes a visual system.

## Decision

Add one capability and two pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `bound-product-pitch` | Ability to bound a product problem into a pitch before a team commits to it. |
| pattern | `fixed-time-variable-scope` | An approach in which the time box is fixed and scope flexes to fit the appetite. |
| pattern | `opinionated-defaults` | An approach in which the product makes the choice instead of exposing a preference, and revisits the default only on evidence. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

The `37signals-way` batch uses `bound-product-pitch` with
`fixed-time-variable-scope` for the overview, build-less principle, deliberate
omission, shaping, betting cycles, common mistakes and diagnostic where the
fixed-time or shaping rule is central; `design-team-organization` with
`team-topology-design` for small autonomous teams; `design-user-interface` with
`opinionated-defaults` for product-chosen defaults; and the existing
`scoring-rubric`, `mistake-list` and `diagnostic-questions` for the scoring,
mistake and diagnostic instructions. Already-applied files keep their existing
metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the three tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
