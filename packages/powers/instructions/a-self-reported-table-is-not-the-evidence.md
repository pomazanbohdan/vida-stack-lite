---
instruction_id: a-self-reported-table-is-not-the-evidence
title: A self-reported table is not the evidence
summary: "A table you filled in yourself does not prove that the content survived the merge; the check has to be run structurally, and a false halt is preferred over a silent success on lost content."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A merge or a rewrite produced a report about what was preserved.
conditions_does_not_apply_when: Nothing was merged or rewritten.
artifact_contract_output_type: preservation-check
artifact_contract_required_data:
  - the check that ran
  - the hunks it confirmed
  - the misses it found
artifact_contract_verified_by: the check ran against the content itself and not against a self-filled table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/reapply-patches.md
status: active
revision: 1
---

# A self-reported table is not the evidence
Do NOT rely solely on the free-text `verified: yes/no` Hunk Verification Table
that table being filled in without an actual content-presence check
The script performs the check structurally and exits non-zero on any miss
Layered gates favour false-positive halts (recoverable) over silent successes on lost content (unrecoverable)
