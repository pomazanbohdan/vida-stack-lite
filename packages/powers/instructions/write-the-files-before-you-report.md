---
instruction_id: write-the-files-before-you-report
title: Write the files before you report
summary: "The artefacts are written and committed before the result is reported, so a lost context never loses the work."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verification-before-completion
conditions_applies_when: A step produces artefacts and then reports back.
conditions_does_not_apply_when: The step produces no artefact.
artifact_contract_output_type: written-artifacts
artifact_contract_required_data:
  - the files written
  - the commit that holds them
artifact_contract_verified_by: the files were on disk and committed before the report
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-project.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/new-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Write the files before you report
Write files first, then return.
This ensures artifacts persist even if context is lost.
Atomic commits: Each phase commits its artifacts immediately.
Roadmap files written immediately (not draft)
