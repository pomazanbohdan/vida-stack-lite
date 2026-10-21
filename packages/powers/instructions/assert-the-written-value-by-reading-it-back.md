---
instruction_id: assert-the-written-value-by-reading-it-back
title: Assert the written value by reading it back
summary: After a write the value is read back and compared with what was intended; a mismatch is surfaced and the run stops instead of continuing on a half-applied write.
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A value was written into a record.
conditions_does_not_apply_when: The write is not read back in this run.
artifact_contract_output_type: write-assertion
artifact_contract_required_data:
  - the value read back
  - the value intended
  - the discrepancy
artifact_contract_verified_by: no run continues past a write that did not land as intended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/mvp-phase.md
status: active
revision: 1
---

# Assert the written value by reading it back
If either assertion fails, surface the discrepancy to the user and exit.
No half-applied write.
Stop and surface it.
Read the value back and compare.
Equality is the criterion.
