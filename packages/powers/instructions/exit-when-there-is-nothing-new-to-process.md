---
instruction_id: exit-when-there-is-nothing-new-to-process
title: Exit when there is nothing new to process
summary: A packaging run that finds no unprocessed candidates says so and stops; it does not repackage what is already packaged.
capability_tags:
  - curate-context
pattern_tags:
  - empty-result-policy
conditions_applies_when: A packaging run looks for candidates that have not been processed yet.
conditions_does_not_apply_when: There are unprocessed candidates to work on.
artifact_contract_output_type: nothing-to-do-report
artifact_contract_required_data:
  - the absence of unprocessed candidates
  - the command that would create them
artifact_contract_verified_by: the run stopped with the empty result reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/sketch-wrap-up.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/spike-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Exit when there is nothing new to process
If no unprocessed sketches exist:
No unprocessed sketches found in `.planning/sketches/`.
If no unprocessed spikes exist:
No unprocessed spikes found in `.planning/spikes/`.
Exit.
