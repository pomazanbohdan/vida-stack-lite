---
instruction_id: record-a-failed-lens-and-continue
title: Record a failed lens and continue with the rest
summary: "A lens that fails, times out, or returns nothing is written down by name, the run continues with the lenses that did report, and every finding keeps the lens that produced it."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: "A lens of the review failed, timed out, or came back empty."
conditions_does_not_apply_when: Every lens reported.
artifact_contract_output_type: failed-lens-ledger
artifact_contract_required_data:
  - the failed lens names
  - the findings that did come back
  - the lens each finding came from
artifact_contract_verified_by: every failed lens is named and every finding names the lens that produced it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/step-02-review.md
status: active
revision: 1
---

# Record a failed lens and continue with the rest
If any lens fails, times out, or returns empty results, append the lens's `name` to `failed_layers` (comma-separated) and proceed with findings from the remaining lenses.
Collect all findings from the completed lenses, keeping track of each finding's originating lens `id`.
