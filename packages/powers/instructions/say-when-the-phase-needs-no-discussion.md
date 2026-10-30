---
instruction_id: say-when-the-phase-needs-no-discussion
title: Say when the phase needs no discussion
summary: "The run says so when the analysis found no open decision worth the user's attention."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: "The analysis found no open decision worth the user's attention."
conditions_does_not_apply_when: At least one meaningful open decision was found.
artifact_contract_output_type: skip-assessment
artifact_contract_required_data:
  - the reason no discussion is needed
artifact_contract_verified_by: the assessment names the reason the discussion is not needed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Say when the phase needs no discussion
**Skip assessment** — If no meaningful gray areas exist (pure infrastructure, clear-cut implementation, all already decided), the phase may not need discussion.
