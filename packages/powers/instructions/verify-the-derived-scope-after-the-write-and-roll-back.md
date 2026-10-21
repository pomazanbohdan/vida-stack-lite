---
instruction_id: verify-the-derived-scope-after-the-write-and-roll-back
title: Verify the derived scope after the write and roll back
summary: "A property derived from the whole document is re-derived after the write, and a change rolls the write back."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A write can change a property that is derived from the document as a whole.
conditions_does_not_apply_when: The write cannot change any derived property.
artifact_contract_output_type: write-report
artifact_contract_required_data:
  - the scope before
  - the scope after
  - the restored content
artifact_contract_verified_by: the scope was re-derived after the write and a changed scope restored the previous content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/edit-phase.md
status: active
revision: 1
---

# Verify the derived scope after the write and roll back
Before writing, capture the current milestone scope (window scope + phase set) so the write can be verified against it:
After writing, re-derive the milestone scope and compare it to the capture:
by replacing the new section text with the original section text, then report and stop
do NOT retry the write
