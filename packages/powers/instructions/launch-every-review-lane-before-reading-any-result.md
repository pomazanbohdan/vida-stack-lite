---
instruction_id: launch-every-review-lane-before-reading-any-result
title: Launch every review lane before reading any result
summary: "The skipped lanes are announced first, every lane is launched, and the collection of results starts only after all of them were launched."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several review lanes will examine the same change.
conditions_does_not_apply_when: Only one lane runs.
artifact_contract_output_type: review-launch-record
artifact_contract_required_data:
  - the lanes that were skipped
  - the lanes that were launched
  - the order they were launched in
artifact_contract_verified_by: every lane was launched before any result was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
---

# Launch every review lane before reading any result
Announce skipped lenses first, then launch every active lens before handling any lens's result.
Spawn every reviewer subagent before reading or reacting to any of their output; begin collection and triage only once all are launched.
