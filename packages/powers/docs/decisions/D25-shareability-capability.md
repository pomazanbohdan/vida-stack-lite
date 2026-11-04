---
type: Decision
title: 'D25 - Shareability capability for the H1 contagious batch'
description: 'One capability tag with a catalog definition lets STEPPS shareability instructions carry a capability that matches business sharing work.'
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
- id: d24
  resource: /decisions/D24-word-of-mouth-tags.md
  title: D24 - Word-of-mouth tags
---

# D25 — Shareability capability for the H1 contagious batch

Date: 2026-11-04
Status: accepted

## Context

The H1 source-admission panel is applying `contagious`. Its STEPPS instructions
direct business shareability work, but the only capability assigned to them was
`write-technical-prose`, which the catalog defines as technical prose. No
existing capability describes designing sharing into a product, campaign or
content.

## Decision

Add one capability tag with an explicit definition to
`catalog.tag_dictionary.capability`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-shareability` | Ability to design sharing into a product, campaign or content through predictable social drivers. |

The tag is metadata only. It does not grant permission, acceptance or admission;
D18 review remains required for every file.

## Application

`contagious` uses `design-shareability` for the STEPPS overview, individual
drivers, combinations and the launch/content rules; `design-user-interface` for
the public/visible-use and feature-design rules; and `verify-work-results` for
the scoring, mistake and diagnostic rules. Already-applied files keep their
existing metadata; no retroactive retag is performed by this decision.

## Consequences

`catalog.json` revision advances by the one tag entry. The corpus, provenance and
instruction bodies are unchanged. The tag dictionary remains the only vocabulary
owner; `check-corpus` validates every new tag against its definition.
