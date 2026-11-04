---
type: Decision
title: 'D23 - Conversion proof and objection tags for the H1 cro-methodology batch'
description: 'One capability and two pattern tags with catalog definitions let conversion proof inventory and objection handling carry accurate metadata.'
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
- id: d20
  resource: /decisions/D20-business-pattern-tags.md
  title: D20 - Business pattern tags
---

# D23 — Conversion proof and objection tags for the H1 cro-methodology batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `cro-methodology`. Its persuasion-asset
inventory and objection/counter-objection table are not described by the
existing tags: `write-technical-prose` covers prose, `message-framework` covers a
narrative order, and `persuasion-principle` covers a decision shortcut. None of
them describes assembling verifiable proof or answering a specific objection at
the point of friction.

## Decision

Add one capability and two pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `assemble-persuasion-proof` | Ability to assemble genuine proof assets and objection counters for a claim. |
| pattern | `proof-inventory` | An approach in which proof assets are inventoried, acquired and placed where a claim needs support. |
| pattern | `objection-handling` | An approach in which each researched objection is answered with specific, verifiable proof at the point of friction. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`cro-methodology` uses `assemble-persuasion-proof` with `proof-inventory` for
the persuasion-asset instruction and with `objection-handling` for the
objection/counter-objection table. The research instructions use
`research-primary-sources` with `decision-scoped-research` and `source-hierarchy`.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the three tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
