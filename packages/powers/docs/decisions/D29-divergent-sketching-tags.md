---
type: Decision
title: 'D29 - Divergent sketching tags for the H1 design-sprint batch'
description: 'One capability and one pattern tag with catalog definitions let independent solution sketching carry accurate metadata.'
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

# D29 — Divergent sketching tags for the H1 design-sprint batch

Date: 2026-11-04
Status: accepted

## Context

The `design-sprint` plan review found that `generate-idea-variations` requires
comparing options before choosing, while the Tuesday and four-step sketch
instructions only generate independent solutions before any group discussion.
No existing capability described that divergent generation step.

## Decision

Add one capability and one pattern tag with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `generate-divergent-sketches` | Ability to generate multiple independent sketches before any selection. |
| pattern | `divergent-sketching` | An approach in which individuals sketch multiple independent solutions before any group discussion. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`design-sprint` uses `generate-divergent-sketches` with `divergent-sketching` for
the Tuesday sketching and four-step sketch instructions. Already-applied files
keep their existing metadata; no retroactive retag is performed by this
decision.

## Consequences

`catalog.json` revision advances by the two tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
