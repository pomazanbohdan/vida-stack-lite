---
type: Decision
title: 'D42 - Negotiation tags for the H1 negotiation batch'
description: 'One capability and eleven pattern tags with catalog definitions let tactical empathy, mirroring, labeling, calibrated questions, accusation audits, that''s-right summaries, Ackerman offers, Black Swans, stall handling, counterpart styles and voice delivery carry accurate metadata.'
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

# D42 — Negotiation tags for the H1 negotiation batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `negotiation`. The source teaches
tactical empathy, mirroring, labeling, calibrated questions, accusation audits,
the "that's right" summary, Ackerman bargaining, Black Swan discovery, stall
handling, counterpart styles and voice delivery. Existing tags cover objections,
persuasion, proof and messages, but not this negotiation vocabulary.

## Decision

Add one capability and eleven pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `negotiate-agreements` | Ability to prepare and conduct a negotiation with tactical empathy and calibrated questions. |
| pattern | `tactical-empathy` | An approach in which the counterpart's situation is voiced before a position is stated. |
| pattern | `mirroring-words` | An approach in which the last critical words are repeated and followed by silence. |
| pattern | `emotion-labeling` | An approach in which the counterpart's emotion is named tentatively and followed by silence. |
| pattern | `calibrated-question` | An approach in which How and What questions steer without triggering defensiveness. |
| pattern | `accusation-audit` | An approach in which every negative the counterpart may think is named before they raise it. |
| pattern | `thats-right` | An approach in which a summary earns "that's right" rather than "you're right". |
| pattern | `ackerman-bargaining` | An approach in which offers rise in decreasing increments to a precise final number with a non-monetary bonus. |
| pattern | `black-swan` | An approach in which hidden constraints, motivations or context are hunted and surfaced. |
| pattern | `stalled-negotiation` | An approach in which a stall is met with a specific question or label rather than a concession. |
| pattern | `negotiation-style` | An approach in which the counterpart is read as analyst, accommodator or assertive and the method adapts. |
| pattern | `negotiation-voice` | An approach in which voice, pause and nonverbals are controlled for calm delivery. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`negotiation` uses `negotiate-agreements` with these patterns. The score,
common-mistakes and quick-diagnostic instructions carry pattern tags only; the
core instruction carries no tags and has both exemptions. The source's
unassigned score bands 4, 7 and 8,
and the near-target Ackerman examples, are preserved as source statements
without invented alignment. Already-applied files keep their existing metadata;
no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the twelve tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
