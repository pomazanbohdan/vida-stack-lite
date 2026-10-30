---
instruction_id: mirror-the-closest-existing-analog
title: Mirror the closest existing analog
summary: "A file that will be created or changed is matched to the closest existing example in the codebase, classified by role and data flow, and the concrete excerpts are carried into the plan."
capability_tags:
  - plan-implementation
pattern_tags:
  - project-conventions-first
conditions_applies_when: A file is about to be created or modified and the plan needs to know what shape it should take.
conditions_does_not_apply_when: The file has no counterpart in the codebase and no established pattern to follow.
artifact_contract_output_type: pattern-map
artifact_contract_required_data:
  - the file list to create or modify
  - the role and data flow of each file
  - the closest existing analog and its excerpts
artifact_contract_verified_by: every file on the list is mapped to an analog with concrete excerpts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/pattern-mapper/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Mirror the closest existing analog
- Extract the list of files to be created/modified from CONTEXT.md and RESEARCH.md. For each file, classify by role and data flow, find the closest existing analog in the codebase, extract concrete code excerpts, and produce PATTERNS.md.
