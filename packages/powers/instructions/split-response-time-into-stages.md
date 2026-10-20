---
instruction_id: split-response-time-into-stages
title: Split the response time into stages
summary: "A slow first byte is attributed to name resolution, the connection handshake or server processing before anything is changed."
capability_tags:
  - improve-web-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The time to the first byte is slower than the target.
conditions_does_not_apply_when: The time to the first byte is inside the target.
artifact_contract_output_type: latency-stage-diagnosis
artifact_contract_required_data:
  - the stage that is slow
  - the measurement of that stage
  - the change made for it
artifact_contract_verified_by: each stage is measured separately and the slow one is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
---

# Split the response time into stages
When TTFB is slow (> 800ms), check each component in DevTools Network waterfall:
- **DNS resolution** slow → add `<link rel="dns-prefetch">` or `<link rel="preconnect">` for known origins
- **TCP/TLS handshake** slow → enable HTTP/2, consider edge deployment, verify keep-alive
- **Server processing** slow → profile backend, check slow queries, add caching
