---
instruction_id: audit-against-general-standards-when-the-plan-is-missing
title: Audit against general standards when the plan is missing
summary: "Without the plan to check against, the audit runs against general standards and says so."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: An audit of finished work is asked for and the plan it was meant to check against is missing.
conditions_does_not_apply_when: The plan exists and the audit runs against it.
artifact_contract_output_type: audit-report
artifact_contract_required_data:
  - the standard the audit used
  - the findings
artifact_contract_verified_by: the report names the general standard it used and the missing plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/eval-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Audit against general standards when the plan is missing
Audit will evaluate against general
best practices rather than a phase-specific plan.
Continue (non-blocking).
