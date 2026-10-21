---
instruction_id: cap-the-fan-out-by-the-host-capacity
title: Cap the fan-out by the host capacity
summary: "The number of things that run at once is bounded by what the host can carry, and a wave that mutates is serialised when there is no isolation."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - resource-bounds
conditions_applies_when: A batch is about to run more than one worker at a time.
conditions_does_not_apply_when: The work runs one item at a time anyway.
artifact_contract_output_type: concurrency-cap
artifact_contract_required_data:
  - the requested number
  - the capacity that bounds it
  - the effective number that was used
artifact_contract_verified_by: the effective concurrency never exceeded the capacity of the host
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
status: active
revision: 1
---

# Cap the fan-out by the host capacity
forces a mutating wave's concurrency to 1; a research-only wave is unaffected
is capped by it
