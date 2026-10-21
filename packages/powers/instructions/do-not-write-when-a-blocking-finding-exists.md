---
instruction_id: do-not-write-when-a-blocking-finding-exists
title: Do not write when a blocking finding exists
summary: "A finding classified as Critical stops the write: nothing is created, no partial artefact is left behind, and the gate holds."
capability_tags:
  - harden-validation
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A check produced a finding that is classified as Critical.
conditions_does_not_apply_when: No finding is Critical and only advisory notes remain.
artifact_contract_output_type: write-gate
artifact_contract_required_data:
  - the Critical findings
  - the fact that nothing was written
artifact_contract_verified_by: no destination file exists after a Critical finding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ingest-docs.md
status: active
revision: 1
---

# Do not write when a blocking finding exists
If any Critical finding exists:
apply the safety gate from the reference - exit WITHOUT writing any files.
The safety gate holds - no destination files are written when Critical findings exist.
Nothing partial is produced.
