---
type: Decision
title: 'D54 - High-craft web experience tags for the H2 top-design batch'
description: 'One capability and ten pattern tags with catalog definitions let typographic hierarchy, compositional tension, choreographed motion, invented palettes, scroll narrative, performance-as-design, craft detail, signature-first order and responsive build order carry accurate metadata.'
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

# D54 — High-craft web experience tags for the H2 top-design batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `top-design`. The source builds
award-level web experiences through typography as architecture, compositional
tension, choreographed motion, invented color, scroll narrative,
performance-as-design, crafted micro-details, a signature-first process and
progressive implementation. Existing tags cover components, accessibility,
performance metrics and microinteractions, but not this art-direction vocabulary.

## Decision

Add one capability and ten pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `art-direct-web-experience` | Ability to art-direct an immersive web experience through typography, composition, motion, color and craft. |
| pattern | `award-winning-craft` | An approach in which a digital experience is built to a competition-grade craft standard. |
| pattern | `typographic-hierarchy` | An approach in which display type carries the design through extreme scale contrast and deliberate tracking. |
| pattern | `compositional-tension` | An approach in which asymmetry, negative space and intentional grid breaks create visual energy. |
| pattern | `choreographed-motion` | An approach in which custom easing and orchestrated sequences give movement purpose and narrative. |
| pattern | `invented-palette` | An approach in which color is built for the project rather than taken from a generic palette. |
| pattern | `scroll-narrative` | An approach in which scroll position drives pacing, reveals and signature moments. |
| pattern | `performance-as-design` | An approach in which load and frame budgets are treated as design constraints from the start. |
| pattern | `craft-detail` | An approach in which selection, focus, loading, error and micro-typography receive deliberate design. |
| pattern | `signature-first-order` | An approach in which the signature moment and display type are designed before layout and build. |
| pattern | `responsive-build-order` | An approach in which the experience is conceptualized desktop-first and built mobile-first. |

The existing `scoring-rubric`, `mistake-list` and `diagnostic-questions`
patterns cover the score, mistakes and diagnostic instructions and are not
redefined. The tags are metadata only and do not admit any source; D18 review
remains required for every file.

## Application

`top-design` uses `art-direct-web-experience` with these patterns. The score,
bands, categories, formula, mistakes and quick-diagnostic instructions carry
pattern tags only, with capability exemptions. This is H2 source admission;
structured applicability under the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the eleven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
