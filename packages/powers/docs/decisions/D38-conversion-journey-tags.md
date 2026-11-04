---
type: Decision
title: 'D38 - Conversion-journey tags for the H1 conversion-optimization batch'
description: 'One capability and eleven pattern tags with catalog definitions let the measured-leak sequence, resumable journey, phase gates, one metric, voice of customer, offer value, form friction and pre-committed experiments carry accurate metadata.'
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

# D38 — Conversion-journey tags for the H1 conversion-optimization batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `conversion-optimization`. The source
orchestrates seven phases from a measured leak to a tested fix, with a resumable
tracker, mandatory diagnosis gates, an OMTM and counter-metric, voice-of-customer
research, offer value, proof placement, form friction and pre-committed
experiments. Existing tags cover experiments, proof, objections, messages and
friction individually, but not the journey, gates or leak-to-proof sequence.

## Decision

Add one capability and eleven pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `run-conversion-journey` | Ability to run a resumable conversion-optimization journey from a measured leak to a tested fix. |
| pattern | `conversion-sequence` | An approach in which a measured leak, researched reason, message, offer, proof and friction are addressed in that order, each with a pre-committed test. |
| pattern | `resumable-journey` | An approach in which a tracker and artifacts let a multi-phase journey resume without restarting. |
| pattern | `phase-gate` | An approach in which mandatory phases unlock downstream work only after their artifact and decision exist. |
| pattern | `leak-diagnosis` | An approach in which the largest absolute drop on the highest-value path is located from measured step conversions. |
| pattern | `one-metric` | An approach in which one primary metric is paired with a counter-metric and a pre-committed target. |
| pattern | `voice-of-customer` | An approach in which objections are drawn from customers' own words in primary and secondary sources. |
| pattern | `value-equation` | An approach in which value rises with dream outcome and perceived likelihood and falls with delay and effort. |
| pattern | `risk-reversal` | An approach in which a guarantee aimed at the top researched objection lowers perceived risk. |
| pattern | `form-friction` | An approach in which fields are cut to the minimum and all costs are shown before the final step. |
| pattern | `experiment-precommit` | An approach in which metric, sample size, duration and decision rule are fixed before a test starts. |
| pattern | `journey-loop` | An approach in which a finished funnel re-enters leak diagnosis with fresh numbers until the target line is met. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`conversion-optimization` uses `run-conversion-journey` with the journey
patterns; existing `objection-handling`, `message-framework`,
`message-stickiness`, `proof-inventory`, `friction-reduction` and
`experiment-design` carry the phase methods. The common-mistakes instruction
carries a pattern tag only, with an explicit capability exemption.
Already-applied files keep their existing metadata; no retroactive retag is
performed by this decision.

## Consequences

`catalog.json` revision advances by the twelve tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
