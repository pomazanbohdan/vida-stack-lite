---
type: Decision
title: 'D39 - Monetization tags for the H1 monetizing-innovation batch'
description: 'One capability and ten pattern tags with catalog definitions let price-before-product, WTP research, the four failures, WTP segmentation, leader/filler/killer packaging, price metrics, freemium, anchors and launch triggers carry accurate metadata.'
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

# D39 — Monetization tags for the H1 monetizing-innovation batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `monetizing-innovation`. The source
designs price before product, measures willingness to pay, diagnoses four
monetization failures, segments by WTP, packages features as leader, filler or
killer, chooses a price metric and model, and uses behavioral pricing with
pre-agreed launch triggers. Existing tags cover offers, value propositions and
proof, but not this pricing vocabulary.

## Decision

Add one capability and ten pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-monetization` | Ability to design price, packaging and monetization model around validated willingness to pay. |
| pattern | `price-before-product` | An approach in which willingness to pay is researched before the product scope, business case or build is fixed. |
| pattern | `wtp-research` | An approach in which willingness to pay is measured with price ranges and purchase-probability trade-offs. |
| pattern | `monetization-failure` | An approach in which a struggling product is classified as feature shock, minivation, hidden gem or undead and given its matching cure. |
| pattern | `wtp-segmentation` | An approach in which customers are grouped by needs and willingness to pay before observable markers. |
| pattern | `leader-filler-killer` | An approach in which every feature is classified by its effect on willingness to pay before tier placement. |
| pattern | `good-better-best` | An approach in which three or four tiers are built around leaders with the middle designed first. |
| pattern | `price-metric` | An approach in which the unit of charging is chosen to grow with delivered value. |
| pattern | `freemium-acquisition` | An approach in which the free tier is treated as acquisition spend rather than the pricing model. |
| pattern | `price-framing` | An approach in which anchors, decoys, the compromise effect and price endings frame perceived value. |
| pattern | `launch-price-trigger` | An approach in which day-30/60/90 thresholds and responses are fixed before launch. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`monetizing-innovation` uses `design-monetization` with the pricing patterns.
The score, common-mistakes and quick-diagnostic instructions carry pattern tags
only, with explicit capability exemptions. Already-applied files keep their
existing metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the eleven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
