---
instruction_id: never-restart-phase-numbering
title: Never restart the phase numbering
summary: The numbering of the phases continues across milestones; a new milestone does not start again at the first phase.
capability_tags:
  - coordinate-program
pattern_tags:
  - stable-identity
conditions_applies_when: A milestone is closed and the next one starts.
conditions_does_not_apply_when: The work never had phases.
artifact_contract_output_type: phase-numbering
artifact_contract_required_data:
  - the last phase number of the milestone
  - the first phase number of the next one
artifact_contract_verified_by: the next milestone continues the numbering of the previous one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/milestone-archive.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/roadmap.md
status: active
revision: 1
---

# Never restart the phase numbering
Continue phase numbering in next milestone (never restart at 01)
Keep continuous phase numbering (never restart at 01)
