---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-cache
title: Layer the caches
summary: "Use content-hashed immutable assets, no-cache plus ETag for HTML, short TTL with stale-while-revalidate for APIs and correct Vary headers at the CDN; never confuse no-cache with no-store."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - cache-layering
conditions_applies_when: "Designing a browser, service-worker, CDN or origin cache policy."
conditions_does_not_apply_when: A response that must never be cached.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each asset class has a cache policy, validation method and Vary decision."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L100-L122"
status: active
revision: 1
---

# Layer the caches

Caching strategies: the fastest network request is one that never happens, so layer caches (browser memory, disk, service worker, CDN, origin) to eliminate round trips for repeat visitors. Cache-Control headers tell browsers and intermediaries how long a response stays valid and content-hashed URLs make aggressive immutable caching safe; each cache hit eliminates a full round trip. no-cache still caches but revalidates every time while no-store never caches; ETag/Last-Modified enable conditional requests returning 304 Not Modified that skip body transfer; service workers provide a programmable cache layer that works offline (cache-first shell, network-first dynamic content); misconfigured Vary headers cause CDN cache pollution serving the wrong encoding or format. Apply immutable caching with content-hashed filenames (e.g., style.a1b2c3.css with max-age=31536000, immutable), no-cache plus ETag for HTML documents, short max-age with stale-while-revalidate for API responses, and correct Vary headers (Accept-Encoding, Accept) at the CDN.
