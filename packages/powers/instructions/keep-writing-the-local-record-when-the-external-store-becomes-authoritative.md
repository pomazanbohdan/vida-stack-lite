---
instruction_id: keep-writing-the-local-record-when-the-external-store-becomes-authoritative
title: Keep writing the local record when the external store becomes authoritative
summary: "When an external store becomes the authority for a fact, the local record is still written, so an unreachable store never loses the fact."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - graceful-degradation
conditions_applies_when: "A fact's authority has moved to an external store."
conditions_does_not_apply_when: The fact was never held in an external store.
artifact_contract_output_type: fact-ownership
artifact_contract_required_data:
  - the authoritative store
  - the local record that is still written
  - what happens when the store is unreachable
artifact_contract_verified_by: the local record exists even when the external store cannot be reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/mempalace/fragments/capture-problems.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/long-running-operations.md
status: active
revision: 1
---

# Keep writing the local record when the external store becomes authoritative
- Under `augment` the fact is an *additive* mirror alongside `.planning/graphs/`. Under `kg_backend`/`replace` the palace is the *authoritative* store for the fact; GSD still writes `.planning/graphs/` through its normal graphify, so an unreachable palace never loses it.
- The core loop depends only on the named fields and ignores any others; producers MUST write the named fields and MAY add their own. The `version` field is the evolution escape hatch.
