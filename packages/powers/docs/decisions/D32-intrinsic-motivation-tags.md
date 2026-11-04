---
type: Decision
title: 'D32 - Intrinsic motivation tags for the H1 drive-motivation batch'
description: 'One capability and six pattern tags with catalog definitions let autonomy, mastery, purpose and reward design carry accurate metadata.'
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

# D32 — Intrinsic motivation tags for the H1 drive-motivation batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `drive-motivation`. The source defines
intrinsic motivation through autonomy, mastery and purpose, the limits of
if-then rewards, now-that rewards, gamification ethics and team/compensation
rules. Existing product patterns describe habit loops, messages and interfaces,
not intrinsic motivation.

## Decision

Add one capability and six pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-intrinsic-motivation` | Ability to design autonomy, mastery and purpose into a product, team or reward system. |
| pattern | `intrinsic-motivation` | An approach in which autonomy, mastery and purpose drive engagement instead of external rewards. |
| pattern | `autonomy-support` | An approach in which people choose what, when, how and with whom they work. |
| pattern | `mastery-path` | An approach in which ability is treated as developable and challenge is matched to skill. |
| pattern | `purpose-connection` | An approach in which work is connected to a larger mission and visible user impact. |
| pattern | `now-that-reward` | An approach in which an unexpected reward follows the work instead of being promised for a target. |
| pattern | `gamification-ethics` | An approach in which gamification is opt-in, skill-based and meaningful rather than points for everything. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`drive-motivation` uses `design-intrinsic-motivation` with the six patterns for
the overview, core claim, rewards, pillars and applied rules; the scoring,
mistake-list and diagnostic instructions carry pattern tags only with explicit
capability exemptions. Already-applied files keep their existing metadata; no
retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the seven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
