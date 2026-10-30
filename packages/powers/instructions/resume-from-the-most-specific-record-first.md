---
instruction_id: resume-from-the-most-specific-record-first
title: Resume from the most specific record first
summary: "When several records describe what was left open, the most specific one wins: the interrupted agent, then the structured handoff, then the mid-plan checkpoint, then the plan without a summary."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A resume finds more than one record about the work that was left open.
conditions_does_not_apply_when: Only one record exists.
artifact_contract_output_type: resume-source
artifact_contract_required_data:
  - the record that was chosen
  - the records that were passed over
artifact_contract_verified_by: the most specific record was the one the resume acted on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/resume-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resume from the most specific record first
Primary: Resume interrupted agent
Primary: Resume from structured handoff (highest priority — specific task/blocker context)
Fallback: Resume from checkpoint
Primary: Complete the incomplete plan
