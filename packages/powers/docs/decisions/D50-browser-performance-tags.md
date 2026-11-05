---
type: Decision
title: 'D50 - Browser-performance tags for the H2 high-perf-browser batch'
description: 'One capability and six pattern tags with catalog definitions let latency budgeting, protocol choice, the critical render path, cache layering, Core Web Vitals and real-time transport carry accurate metadata.'
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

# D50 — Browser-performance tags for the H2 high-perf-browser batch

Date: 2026-11-05
Status: accepted

## Context

The H2 source-admission panel is applying `high-perf-browser`. The source treats
latency as the bottleneck and covers network round trips, HTTP evolution,
critical rendering, cache layering, Core Web Vitals and real-time transport.
Existing tags cover UX and production readiness but not these browser-network
patterns.

## Decision

Add one capability and six pattern tags with explicit definitions to
`catalog.tag_dictionary`:

| Dimension | Tag | Definition |
|---|---|---|
| capability | `optimize-web-performance` | Ability to reduce browser round trips and improve field performance metrics. |
| pattern | `latency-budget` | An approach in which round trips, not bandwidth, are treated as the performance bottleneck. |
| pattern | `protocol-version-choice` | An approach in which the protocol version is chosen and configured to remove its predecessor's workarounds. |
| pattern | `critical-render-path` | An approach in which render-blocking resources are removed from the first-paint path. |
| pattern | `cache-layering` | An approach in which browser, service-worker, CDN and origin caches eliminate repeat requests. |
| pattern | `core-web-vitals` | An approach in which LCP, INP and CLS are optimized as the user-facing milestones. |
| pattern | `realtime-transport` | An approach in which WebSocket, SSE or polling is chosen by data direction and frequency. |

The tags are metadata only. They do not grant permission, acceptance or
admission; D18 review remains required for every file.

## Application

`high-perf-browser` uses `optimize-web-performance` with these patterns. The
score, common-mistakes and quick-diagnostic instructions carry pattern tags only,
with capability exemptions; the apply and framework-overview instructions carry
pattern exemptions. This is H2 source admission; structured applicability under
the H2 v2 contract remains pending.

## Consequences

`catalog.json` revision advances by the seven tag entries. The corpus,
provenance and instruction bodies are unchanged. The tag dictionary remains the
only vocabulary owner; `check-corpus` validates every new tag against its
definition.
