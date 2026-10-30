---
instruction_id: edit-a-shared-file-never-replace-it-whole
title: "Edit a shared file, never replace it whole"
summary: "A file that other workers also write is edited section by section, never written as a whole, and the section is checked to be untouched before the edit lands."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A file is written that another worker may also write.
conditions_does_not_apply_when: The file belongs to one writer only.
artifact_contract_output_type: shared-file-edit
artifact_contract_required_data:
  - the section written
  - the check that it was still a placeholder
artifact_contract_verified_by: no whole-file write reached the shared file and the section was still free before the edit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Edit a shared file, never replace it whole
Write replaces the entire file and will overwrite work from parallel or sequential sibling agents.
Before editing, verify the section you are about to write is still a template placeholder.
