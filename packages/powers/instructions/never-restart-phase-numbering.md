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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/milestone-archive.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/roadmap.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never restart the phase numbering
Continue phase numbering in next milestone (never restart at 01)
Keep continuous phase numbering (never restart at 01)
