---
instruction_id: propose-the-grouping-before-you-write-the-files
title: Propose the grouping before you write the files
summary: "The curated items are proposed as groups, the grouping is approved, and each approved group becomes one file."
capability_tags:
  - curate-context
pattern_tags:
  - source-hierarchy
conditions_applies_when: Several curated items have to be organised into a package.
conditions_does_not_apply_when: The organisation is fixed by the format of the package.
artifact_contract_output_type: grouping-proposal
artifact_contract_required_data:
  - the groups
  - the items per group
  - the approval
artifact_contract_verified_by: the grouping was approved before any file was written and each group became one file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch-wrap-up.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Propose the grouping before you write the files
Propose design-area groupings, e.g.:
Present the grouping for approval — user may merge, split, rename, or rearrange
Each group becomes one reference file in the generated skill.
