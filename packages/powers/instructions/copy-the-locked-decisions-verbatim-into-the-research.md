---
instruction_id: copy-the-locked-decisions-verbatim-into-the-research
title: Copy the locked decisions verbatim into the research
summary: "The decisions that were already locked are copied as they stand, and the ideas that were deferred are not researched at all."
capability_tags:
  - research-primary-sources
pattern_tags:
  - frozen-intent
conditions_applies_when: The research starts and locked decisions exist.
conditions_does_not_apply_when: No decision has been locked yet.
artifact_contract_output_type: research-constraints
artifact_contract_required_data:
  - the locked decisions
  - the deferred ideas that are out of scope
artifact_contract_verified_by: the locked decisions are copied verbatim and the deferred ideas are listed as out of scope
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Copy the locked decisions verbatim into the research
copy locked decisions here verbatim. These MUST be honored by the planner.
[Copy from CONTEXT.md - do NOT research or plan these]
