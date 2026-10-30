---
instruction_id: show-the-existing-artifacts-before-you-overwrite-them
title: Show the existing artifacts before you overwrite them
summary: "Before a fresh pass replaces documents that already exist, they are listed with the date they were last changed and the owner decides whether the pass runs."
capability_tags:
  - author-setup-scripts
pattern_tags:
  - setup-scripting
conditions_applies_when: A generated document already exists and the run would replace it.
conditions_does_not_apply_when: No such document exists yet.
artifact_contract_output_type: overwrite-prompt
artifact_contract_required_data:
  - the existing documents
  - the date each was changed
  - the decision
artifact_contract_verified_by: the existing documents and their dates were shown and the run stopped on a refusal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/scan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the existing artifacts before you overwrite them
For each target document, check if it already exists
If any exist, show their modification dates and ask
Overwrite with fresh scan?
If user says no, exit
