---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-network
title: Reduce network round trips
summary: "Keep critical resources under the ~14KB slow-start threshold, use TLS 1.3 with session resumption, preconnect critical origins, dns-prefetch third parties and rely on keep-alive."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - latency-budget
conditions_applies_when: Tuning servers or diagnosing handshake latency.
conditions_does_not_apply_when: A local-only resource with no network request.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Critical resources, TLS, preconnect and keep-alive decisions are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L28-L51"
status: active
revision: 1
---

# Reduce network round trips

Network Fundamentals: every HTTP request pays a latency tax — DNS lookup, TCP three-way handshake, TLS negotiation — before application data flows, and reducing or eliminating these round trips is the single highest-leverage optimization. TCP's three-way handshake adds one full RTT before data transfer; TCP slow start limits initial throughput to ~14KB (10 segments) in the first round trip, so critical resources should be kept under this threshold; head-of-line blocking means one lost packet stalls all streams on the connection; the bandwidth-delay product caps in-flight data so high-latency links underutilize bandwidth. Upgrade to TLS 1.3 because it halves handshake round trips versus TLS 1.2 and enables 0-RTT resumption for returning visitors. Apply connection warmup via preconnect to critical origins, dns-prefetch for third-party domains (saves ~20-120ms), TLS 1.3 with session tickets, and keep-alive connection reuse (default in HTTP/1.1+).
