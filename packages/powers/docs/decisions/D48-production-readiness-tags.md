---
type: Decision
title: 'D48 - Production-readiness tags for the H2 release-it batch'
description: 'One capability, six new pattern tags and the existing graceful-degradation definition let stability anti-patterns and patterns, capacity, release decoupling, observability and chaos safety carry accurate metadata.'
status: stable
stale_after: '2027-11-05T00:00:00Z'
tags:
- vida-powers
- engineering
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

# D48 — Production-readiness tags for the H2 release-it batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `release-it`. The source designs
production-ready systems through stability anti-patterns, stability patterns,
capacity models, deploy/release separation, observability and safe failure
injection. Existing tags cover deployment, monitoring and resilience only
partially.

## Decision

Add one capability and seven pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `design-production-readiness` | Ability to design, deploy and operate a production-ready system that degrades gracefully. |
| pattern | `graceful-degradation` | Existing definition reused: an approach in which a failure produces a safe default or a degraded result instead of a crash. |
| pattern | `stability-anti-pattern` | An approach in which every integration point is audited for the failure pattern it enables. |
| pattern | `stability-pattern` | An approach in which breakers, bulkheads and timeouts cap the blast radius of one failure. |
| pattern | `capacity-model` | An approach in which the first bottleneck and its load are measured before capacity is promised. |
| pattern | `release-decoupling` | An approach in which deployment and user release are independent operations. |
| pattern | `observability-first` | An approach in which deep health, correlated telemetry and user-facing SLOs are designed before operation. |
| pattern | `chaos-safety` | An approach in which failure injection is planned with authorization, approvals and rollback. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`release-it` uses `design-production-readiness` with these patterns. The score,
common-mistakes and quick-diagnostic instructions carry pattern tags only, with
capability exemptions. This is H2 source admission; structured applicability
under the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the seven new tag entries; the existing
`graceful-degradation` definition is reused unchanged. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
