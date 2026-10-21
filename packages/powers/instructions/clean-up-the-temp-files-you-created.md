---
instruction_id: clean-up-the-temp-files-you-created
title: Clean up the temp files you created
summary: The scratch files of the run are removed at the end — and only the ones this run created.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - verification-before-completion
conditions_applies_when: A run created scratch files that hold sampled data.
conditions_does_not_apply_when: The run created no scratch files.
artifact_contract_output_type: cleanup-record
artifact_contract_required_data:
  - the temporary paths that were removed
  - the paths that were left because they were not created by this run
artifact_contract_verified_by: the scratch files of this run are gone and no other path was touched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 1
---

# Clean up the temp files you created
Remove the temp directory created by profile-sample
contains sample JSONL and analysis JSON
Also remove any standalone temp files created for questionnaire answers:
(Only clean up temp paths that were actually created during this workflow run.)
