---
instruction_id: check-that-a-recorded-item-still-points-at-something-real
title: Check that a recorded item still points at something real
summary: "Every recorded item is checked against the code before it is offered as work: the thing it names may be gone, rewritten, or still there."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A list of recorded items is offered as the work to do.
conditions_does_not_apply_when: The items were just created in this run.
artifact_contract_output_type: item-freshness-check
artifact_contract_required_data:
  - the state of each item
  - the reason it carries that state
artifact_contract_verified_by: every offered item was checked against the code before it was offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/audit-uat.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Check that a recorded item still points at something real
For each item in "Testable Now", use Grep/Read to check if the underlying feature still exists in the codebase:
If the test references a component/function that no longer exists → mark as `stale`
If the test references code that has been significantly rewritten → mark as `needs_update`
Otherwise → mark as `active`
