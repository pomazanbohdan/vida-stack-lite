---
instruction_id: a-requirement-nobody-verified-is-unsatisfied
title: A requirement nobody verified is unsatisfied
summary: "A requirement that was assigned but that no phase verified is flagged as orphaned and treated as unsatisfied, not as merely unproven."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A requirement is assigned but no verification record mentions it.
conditions_does_not_apply_when: At least one verification record covers the requirement.
artifact_contract_output_type: orphan-requirement-report
artifact_contract_required_data:
  - the orphaned requirement
  - the status it is given
artifact_contract_verified_by: the orphaned requirement is reported and counted as unsatisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# A requirement nobody verified is unsatisfied
Requirements present in REQUIREMENTS.md traceability table but absent from ALL phase VERIFICATION.md files MUST be flagged as orphaned.
Orphaned requirements are treated as `unsatisfied` - they were assigned but never verified by any phase.
