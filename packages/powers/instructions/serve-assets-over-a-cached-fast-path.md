---
instruction_id: serve-assets-over-a-cached-fast-path
title: Serve assets over a cached fast path
summary: "Static assets are cached with a long lifetime and a content hash, the protocol is the fast one, and the known origins are preconnected."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: Assets are served to a client over the network.
conditions_does_not_apply_when: The work ships no assets over the network.
artifact_contract_output_type: asset-delivery-review
artifact_contract_required_data:
  - the cache lifetime of the static assets
  - the protocol
  - the preconnected origins
  - the redirects
artifact_contract_verified_by: every static asset is served with a long cache lifetime and a content hash
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Serve assets over a cached fast path
Static assets cached with long `max-age` + content hashing
API responses cached where appropriate (`Cache-Control`)
HTTP/2 or HTTP/3 enabled
Resources preconnected (`<link rel="preconnect">`) for known origins
`fetchpriority` used on critical non-image resources (e.g., key `<link rel="preload">`, above-the-fold `<script>`) — not only on `<img>`
No unnecessary redirects
