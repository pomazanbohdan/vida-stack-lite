---
instruction_id: keep-the-result-order-independent-of-completion-order
title: Keep the result order independent of the completion order
summary: "Concurrent results are written to separate files and concatenated in the selected order, so completion order never reaches the artefact."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several workers run at once and their results are combined.
conditions_does_not_apply_when: One worker produces the whole result.
artifact_contract_output_type: ordered-results
artifact_contract_required_data:
  - the order the workers were selected in
  - the file each result was written to
  - the order the results were concatenated in
artifact_contract_verified_by: the artefact reads identically whether the workers ran in sequence or at once
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/opt-in-parallel-reviewer-lanes.md
status: active
revision: 1
---

# Keep the result order independent of the completion order
Result ordering is unchanged in both modes.
Per-lane results are written to slug-scoped files and concatenated in reviewer-selection order after the join
Completion order never reaches the artifact.
This also means concurrent lanes never share an append handle
