---
instruction_id: leave-the-working-copy-clean-after-the-run
title: Leave the working copy clean after the run
summary: "The files the run changed are committed, the commits of the run are kept, and the working copy is verified clean before the run ends."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The run produced changes in a version-controlled working copy.
conditions_does_not_apply_when: Version control is unavailable.
artifact_contract_output_type: finalization-record
artifact_contract_required_data:
  - the committed files
  - the clean working copy
  - the blocking condition when it was not clean
artifact_contract_verified_by: the working copy was verified clean and nothing was pushed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Leave the working copy clean after the run
Commit any reviewed-diff files that remain uncommitted
Keep commits already created during this run.
Verify the version-controlled working copy is clean.
Otherwise HALT with status `blocked` and blocking condition `finalization left repository dirty`.
