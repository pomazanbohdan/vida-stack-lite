---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-common-mistakes
title: Avoid the listed performance mistakes
summary: "Avoid adding bandwidth, loading all JS upfront, omitting resource hints, missing Cache-Control, ignoring CLS, WebSocket for everything, domain sharding on HTTP/2 and no compression; apply each fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a performance plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L171-L183"
status: active
revision: 1
---

# Avoid the listed performance mistakes

Common mistakes to avoid: adding bandwidth to fix slow pages (latency, not throughput, is the bottleneck — reduce round trips via preconnect, cache, CDN); loading all JS upfront (parser-blocking scripts delay paint — code-split, defer, lazy-load non-critical modules); omitting resource hints (the browser discovers critical resources too late — use preconnect plus preload for above-fold criticals); missing Cache-Control or using no-store everywhere (every visit re-downloads everything — use proper max-age with content hashing); ignoring CLS (layout shifts destroy trust and ranking — set explicit dimensions on images, embeds, ads); using WebSocket for everything (match transport to data flow; SSE suffices for server push); domain sharding on HTTP/2 (defeats multiplexing — consolidate origins); and enabling no compression (enable Brotli preferred or Gzip fallback on server/CDN).
