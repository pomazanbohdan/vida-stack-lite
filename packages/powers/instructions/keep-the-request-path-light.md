---
instruction_id: keep-the-request-path-light
title: Keep the request path light
summary: "The request handler does no heavy computation, bulk work is done in one operation, and the response is compressed and cached where it can be."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A request handler or an API endpoint is written or changed.
conditions_does_not_apply_when: The work touches no request handler.
artifact_contract_output_type: request-path-review
artifact_contract_required_data:
  - the work done inside the handler
  - the bulk operation
  - the compression
  - the caching layer
artifact_contract_verified_by: no heavy computation runs inside the request handler
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 2
---

# Keep the request path light
No synchronous heavy computation in request handlers
Bulk operations instead of loops of individual calls
Response compression (gzip/brotli)
Appropriate caching (in-memory, Redis, CDN)
