---
type: Decision
title: 'D28 - Sales metric cadence tags for the H1 predictable-revenue batch'
description: 'One capability and one pattern tag with catalog definitions let sales activity, result and efficiency tracking carry accurate metadata.'
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
- id: d26
  resource: /decisions/D26-sales-process-tags.md
  title: D26 - Sales process tags
---

# D28 — Sales metric cadence tags for the H1 predictable-revenue batch

Date: 2026-11-04
Status: accepted

## Context

The `predictable-revenue` plan review found that `metric-gated-decision`
requires threshold-based next steps, while the leading, lagging and efficiency
instructions only track metrics on a review cadence. No existing capability
described sales metric tracking without a threshold action.

## Decision

Add one capability and one pattern tag with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `run-sales-metrics` | Ability to track sales activity, result and efficiency metrics on a stated review cadence. |
| pattern | `sales-metric-cadence` | An approach in which sales activity, result and efficiency metrics are tracked on a stated review cadence. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`predictable-revenue` uses `run-sales-metrics` with `sales-metric-cadence` for
the leading-indicator, lagging-indicator and efficiency instructions.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the two tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
