---
instruction_id: check-the-plan-against-the-readiness-standard
title: Check the plan against the readiness standard
summary: "The plan is checked against a fixed readiness standard, and each criterion is one the implementer can settle without asking."
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: The plan is written and has to pass a readiness standard before the work starts.
conditions_does_not_apply_when: There is no written readiness standard for the work.
artifact_contract_output_type: readiness-check
artifact_contract_required_data:
  - the criteria
  - the criterion that failed
  - the evidence for the verdict
artifact_contract_verified_by: every criterion of the standard was checked against the plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Check the plan against the readiness standard
**Actionable**: Every task has a file path and specific action.
**Verifiable**: `## Verification` runs every test file a loaded ticket companion lists, and each command names the result that makes it pass.
**Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.
**Coherent**: No unresolved ambiguities or internal contradictions.
