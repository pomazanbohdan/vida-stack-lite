---
type: Decision
title: 'D45 - Website-growth tags for the H1 grow-website batch'
description: 'One capability and one pattern tag with catalog definitions let the research-first website-growth journey and existing-traffic conversion carry accurate metadata.'
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

# D45 — Website-growth tags for the H1 grow-website batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `grow-website`. The source turns
existing traffic into more leads, buyers and referrals through eight
research-first phases. Existing tags cover conversion sequences, leaks,
objections, scorecards, messages, persuasion, offers, shareability and the
marketing machine. The website-growth capability and the existing-traffic rule
are new.

## Decision

Add one capability and one pattern tag with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-website-growth` | Ability to turn existing website traffic into more leads, buyers and referrals. |
| pattern | `traffic-conversion` | An approach in which existing visitors are captured and converted before more traffic is bought. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`grow-website` uses `design-website-growth` with `traffic-conversion` and the
existing `resumable-journey`, `leak-diagnosis`, `objection-handling`,
`scorecard-questionnaire`, `message-framework`, `message-stickiness`,
`persuasion-principle`, `persuasion-ethics`, `proof-inventory`,
`grand-slam-offer`, `word-of-mouth-shareability`, `marketing-machine` and
`mistake-list`. The common-mistakes instruction carries a pattern tag only, with
a capability exemption; the journey-map, optional-phase and closure
instructions carry pattern exemptions. Already-applied files keep their existing
metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the two tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
