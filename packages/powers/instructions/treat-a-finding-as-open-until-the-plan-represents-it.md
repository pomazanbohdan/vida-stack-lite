---
instruction_id: treat-a-finding-as-open-until-the-plan-represents-it
title: Treat a finding as open until the plan represents it
summary: "A finding that the plan does not yet carry is still open, whatever its severity; it closes only when the plan takes it up or records why it is not."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - source-conversion
  - stop-on-conflict
conditions_applies_when: A review produced findings and the question is whether the phase may be considered done.
conditions_does_not_apply_when: The findings are already represented in the plan.
artifact_contract_output_type: open-findings
artifact_contract_required_data:
  - the findings that are still open
  - the plan content that would represent each of them
artifact_contract_verified_by: every finding is either visible in the plan or carries an explicit deferral or rejection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Treat a finding as open until the plan represents it
ACTIONABLE — a non-HIGH review finding that would be invisible to

unless it is incorporated into PLAN.md or explicitly deferred/rejected in PLAN.md.

MEDIUM/LOW concerns that are already incorporated into a PLAN.md task, action, acceptance_criteria, verify command, must_haves item, threat model, artifact list, or explicit deferral/rejection rationale

Actionable MEDIUM/LOW findings must be incorporated into executable PLAN.md content or explicitly deferred/rejected in the relevant PLAN.md before convergence can complete.
