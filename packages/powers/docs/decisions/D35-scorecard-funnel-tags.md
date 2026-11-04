---
type: Decision
title: 'D35 - Scorecard funnel tags for the H1 scorecard-marketing batch'
description: 'One capability and five pattern tags with catalog definitions let the scorecard hook, questionnaire, tiers, nurture and benchmarks carry accurate metadata.'
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

# D35 — Scorecard funnel tags for the H1 scorecard-marketing batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `scorecard-marketing`. The source
defines a scorecard funnel: a hook that surfaces a dormant desire, contact
capture before scored questions, tiered dynamic results, segmented nurture and
benchmark conversion ranges. The existing business patterns describe lead
capture, value propositions and nurture, but not the scorecard-specific hook,
questionnaire, tiers or benchmark role.

## Decision

Add one capability and five pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-scorecard-funnel` | Ability to design a scorecard funnel from hook to segmented follow-up. |
| pattern | `scorecard-hook` | An approach in which a scorecard hook surfaces a dormant desire and promises a personalized result. |
| pattern | `scorecard-questionnaire` | An approach in which contact capture precedes scored questions grouped into 2-7 categories. |
| pattern | `scorecard-tiers` | An approach in which results are split into tiers with dynamic content and a tier-specific CTA. |
| pattern | `scorecard-nurture` | An approach in which follow-up is segmented by score tier and abandonment is recovered. |
| pattern | `scorecard-benchmark` | An approach in which published conversion ranges are used as benchmarks, not guarantees. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`scorecard-marketing` uses `design-scorecard-funnel` with the five patterns for
the funnel rules, and the existing `value-proposition` and
`implementation-planning` patterns for naming and launch; the score,
mistake-list and diagnostic instructions carry pattern tags only with explicit
capability exemptions. Already-applied files keep their existing metadata; no
retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the six tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
