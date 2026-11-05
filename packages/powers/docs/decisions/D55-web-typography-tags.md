---
type: Decision
title: 'D55 - Web typography tags for the H2 web-typography batch'
description: 'One capability and nine pattern tags with catalog definitions let reading mechanics, typeface evaluation, purposeful selection, contrast pairing, readable measure, type-level hierarchy and fluid loading carry accurate metadata.'
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

# D55 — Web typography tags for the H2 web-typography batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `web-typography`. The source chooses,
pairs and implements typefaces for readable web content: reading mechanics,
typeface evaluation, purposeful selection, contrast pairing, core measurements,
hierarchy, fluid sizing and font loading. D54's `typographic-hierarchy` describes
display type carrying an art-directed experience; it does not cover practical
body-text hierarchy. No existing capability describes the selection and
implementation of readable web type.

## Decision

Add one capability and nine pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `set-web-type` | Ability to select, pair and implement readable web typography. |
| pattern | `invisible-typography` | An approach in which typography stays clear and invisible so the content carries the voice. |
| pattern | `type-context` | An approach in which display type and reading type are chosen for different purposes. |
| pattern | `reading-mechanics` | An approach in which saccades, fixations and word shapes inform line length and spacing. |
| pattern | `typeface-evaluation` | An approach in which technical, structural and practical checks gate a typeface. |
| pattern | `purposeful-type-choice` | An approach in which the content's tone and reading context choose the typeface. |
| pattern | `type-pairing-contrast` | An approach in which one or two typefaces pair through clear structural contrast. |
| pattern | `readable-measure` | An approach in which body size, line length and line height are fixed for comfortable reading. |
| pattern | `type-level-contrast` | An approach in which adjacent type levels differ by one or two levers and never skip levels. |
| pattern | `fluid-type` | An approach in which clamp-based sizes and font-loading budgets adapt type to every viewport. |

The existing `scoring-rubric`, `mistake-list` and `diagnostic-questions` patterns
cover the score, mistakes and diagnostic instructions. D54's
`typographic-hierarchy` is not redefined and is not reused here. The tags are
metadata only and do not admit any source; D18 review remains required for every
file.

## Application

`web-typography` uses `set-web-type` with these patterns. The score,
common-mistakes and quick-diagnostic instructions carry pattern tags only, with
capability exemptions. This is H2 source admission; structured applicability
under the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the ten tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
