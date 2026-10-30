---
instruction_id: ask-before-you-overwrite-a-hand-written-document
title: Ask before you overwrite a hand-written document
summary: "A hand-written file is preserved, supplemented or regenerated on the user's decision; the safe default applies otherwise."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A file that somebody wrote by hand is in the set of files to be written.
conditions_does_not_apply_when: The file was produced by the same tool in an earlier run.
artifact_contract_output_type: preservation-decision
artifact_contract_required_data:
  - the file
  - the decision
  - the reason
artifact_contract_verified_by: the decision was recorded and the safe default applies where no answer could be taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask before you overwrite a hand-written document
How should this file be handled?
[1] preserve    -- Skip entirely. Leave unchanged.
[2] supplement  -- Append only missing sections. Existing content untouched.
[3] regenerate  -- Overwrite with a fresh
generated document.
Default all hand-written docs to `preserve` (safest default).
Record each decision. Update the doc queue:
