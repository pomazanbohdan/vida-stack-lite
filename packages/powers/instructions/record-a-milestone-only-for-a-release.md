---
instruction_id: record-a-milestone-only-for-a-release
title: Record a milestone only for a release
summary: "A milestone is recorded when something shipped, not for a phase, for work in progress or for a small fix."
capability_tags:
  - coordinate-program
pattern_tags:
  - release-readiness
conditions_applies_when: A milestone entry is written.
conditions_does_not_apply_when: The milestone was already recorded.
artifact_contract_output_type: milestone-entry
artifact_contract_required_data:
  - what was delivered
  - the phases completed
  - the stats
artifact_contract_verified_by: the entry names a shipped release and not a phase or a fix
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record a milestone only for a release
**Don't create milestones for:** - Individual phase completions (normal workflow) - Work in progress (wait until shipped) - Minor bug fixes that don't constitute a release
