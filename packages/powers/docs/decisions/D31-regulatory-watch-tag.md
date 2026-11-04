---
type: Decision
title: 'D31 - Regulatory watch tag for the H1 hooked-ux batch'
description: 'One pattern tag with a catalog definition lets the regulatory monitoring instruction carry accurate metadata.'
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
- id: d30
  resource: /decisions/D30-habit-loop-tags.md
  title: D30 - Habit-loop tags
---

# D31 — Regulatory watch tag for the H1 hooked-ux batch

Date: 2026-11-04
Status: accepted

## Decision

Add one pattern tag with an explicit definition to
`catalog.tag_dictionary.pattern`:

| Dimension | Tag | Definition |
|---|---|---|
| pattern | `regulatory-watch` | An approach in which applicable regulation is monitored for a product. |

The tag is metadata only. It does not grant permission, acceptance or admission;
D18 review remains required for every file.

## Application

`hooked-ux` uses `regulatory-watch` for the COPPA/GDPR-K, dark-pattern,
notification and loot-box monitoring instruction. D30's `habit-ethics` remains
for the manipulation matrix and the when-not-to-use rules. Already-applied files
keep their existing metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the one tag entry. The corpus, provenance and
instruction bodies are unchanged. The tag dictionary remains the only vocabulary
owner; `check-corpus` validates every new tag against its definition.
