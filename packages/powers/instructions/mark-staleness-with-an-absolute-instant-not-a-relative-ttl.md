---
instruction_id: mark-staleness-with-an-absolute-instant-not-a-relative-ttl
title: "Mark staleness with an absolute instant, not a relative ttl"
summary: Staleness is marked with an absolute instant; the decision is then a plain comparison that does not depend on when the document was read.
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A document has a point in time after which its content is stale.
conditions_does_not_apply_when: The document is rebuilt on every read and never goes stale.
artifact_contract_output_type: staleness-mark
artifact_contract_required_data:
  - the instant after which the content is stale
  - the comparison that decides it
artifact_contract_verified_by: the stale instant is absolute and the decision is a comparison against the current time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 1
---

# Mark staleness with an absolute instant, not a relative ttl
Optional. An absolute instant.
A concept is stale when `now >= stale_after`.
An absolute instant, not a relative TTL, keeps the staleness decision a plain comparison with no reference to when the concept was read.
