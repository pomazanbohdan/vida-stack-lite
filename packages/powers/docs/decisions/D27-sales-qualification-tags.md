---
type: Decision
title: 'D27 - Sales qualification and lead-mix tags for the H1 predictable-revenue batch'
description: 'Four pattern tags with catalog definitions let lead mix, follow-up cadence, ANUM qualification and ICP carry accurate metadata.'
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

# D27 — Sales qualification and lead-mix tags for the H1 predictable-revenue batch

Date: 2026-11-04
Status: accepted

## Context

The first `predictable-revenue` plan review found that several existing business
patterns require content the instruction bodies do not contain:
`channel-measurement` requires cost/value tracking, `nurture-sequence` requires
value-first education and unsubscribe handling, `sales-conversion` requires
objection proof and risk reversal, `lifetime-value` requires cohort retention and
reactivation, and `customer-avatar` requires customer gains. The source instead
defines a lead-type mix, a fixed follow-up cadence, ANUM qualification and a
firmographic ICP.

## Decision

Add four pattern tags with explicit definitions to
`catalog.tag_dictionary.pattern`:

| Tag | Definition |
|---|---|
| `lead-type-mix` | An approach in which leads are classified by source, conversion and cost and investment follows the mix. |
| `follow-up-cadence` | An approach in which an outbound sequence follows a fixed day-by-day cadence with a break-up and re-engagement step. |
| `sales-qualification` | An approach in which an opportunity is qualified on authority, need, urgency and money before handoff. |
| `ideal-customer-profile` | An approach in which the target account profile is defined by firmographics and pain before list building. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`predictable-revenue` uses `lead-type-mix` for the seeds/nets/spears rule,
`follow-up-cadence` for the Day 1/3/7/14/30 sequence, `sales-qualification` for
ANUM, `ideal-customer-profile` for the ICP, and `customer-experience` for the CSM
retention role. Already-applied files keep their existing metadata; no
retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the four tag entries. The corpus, provenance
and instruction bodies are unchanged. The tag dictionary remains the only
vocabulary owner; `check-corpus` validates every new tag against its definition.
