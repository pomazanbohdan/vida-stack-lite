---
type: Decision
title: 'D24 - Word-of-mouth tags for the H1 contagious batch'
description: 'Two pattern tags with catalog definitions let STEPPS shareability and launch/content/feature fit carry accurate metadata.'
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

# D24 — Word-of-mouth tags for the H1 contagious batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `contagious`. The donor defines STEPPS
as a distinct word-of-mouth framework, not as the `message-stickiness` idea
(simple, unexpected, concrete, credible, emotional, story-driven) from another
book. The launch, content and feature tables match sharing drivers to an
artifact type; `marketing-plan` and `referral-program` describe different things.
Reusing those tags produced three Important review findings.

## Decision

Add two pattern tags with explicit definitions to
`catalog.tag_dictionary.pattern`:

| Tag | Definition |
|---|---|
| `word-of-mouth-shareability` | An approach in which sharing is designed into a product, campaign or content through predictable social and psychological drivers. |
| `shareability-fit` | An approach in which a sharing driver is matched to a launch phase, content format or feature by its stated fit. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`contagious` uses `word-of-mouth-shareability` for the STEPPS overview,
individual drivers, combinations and the common-mistakes/diagnostic rules, and
`shareability-fit` for the launch, content and feature-design tables.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the two tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
