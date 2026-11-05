---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-core
title: Treat latency as the bottleneck
summary: "Reduce round trips rather than adding bandwidth: every request pays DNS, TCP, TLS and HTTP latency, and a 5x latency cut beats a 5x bandwidth increase."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - latency-budget
conditions_applies_when: Diagnosing or budgeting web performance.
conditions_does_not_apply_when: A bandwidth-only transfer problem with no request latency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan reduces round trips and does not rely on bandwidth alone.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L14-L19"
status: active
revision: 1
---

# Treat latency as the bottleneck

Latency, not bandwidth, is the bottleneck: most web performance problems stem from too many round trips rather than insufficient throughput, so a 5x bandwidth increase yields diminishing returns while a 5x latency reduction transforms the user experience. Every request passes through DNS resolution, TCP handshake, TLS negotiation, and HTTP exchange before any content arrives, each step adding round-trip latency; high-performance applications must therefore minimize round trips, parallelize requests, and eliminate unnecessary network hops, and understanding the protocol stack is a prerequisite for meaningful optimization.
