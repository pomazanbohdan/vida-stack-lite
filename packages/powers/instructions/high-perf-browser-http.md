---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-http
title: Choose and configure HTTP
summary: "Remove HTTP/1.1 workarounds once HTTP/2+ is enabled, prefer 103 Early Hints over Server Push, advertise HTTP/3 with Alt-Svc and signal stream priority for CSS and fonts."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - protocol-version-choice
conditions_applies_when: Choosing or migrating an HTTP protocol version.
conditions_does_not_apply_when: A server that cannot change protocol version.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The protocol choice, workaround removal and hints are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L52-L76"
status: active
revision: 1
---

# Choose and configure HTTP

HTTP protocol evolution: HTTP/1.1 allows only one outstanding request per TCP connection (browsers open ~6 per host as a workaround) and forces workarounds like domain sharding, sprites, and concatenation; HTTP/2 multiplexes unlimited streams over one connection with HPACK header compression cutting repetitive header overhead by 85-95%, making those HTTP/1.1 workarounds counterproductive; HTTP/3 (QUIC over UDP) additionally eliminates TCP head-of-line blocking and enables 0-RTT resumption and connection migration. Prefer 103 Early Hints over HTTP/2 Server Push, which over-pushes and is widely deprecated; connection coalescing lets one HTTP/2 connection serve multiple hostnames sharing a certificate. When migrating to HTTP/2, remove domain sharding, sprites, and file concatenation; advertise HTTP/3 via an Alt-Svc header; and signal stream priority with CSS and fonts highest and images lower.
