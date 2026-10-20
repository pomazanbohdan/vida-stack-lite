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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 1
---

# Check the plan against the readiness standard
**Actionable**: Every task has a file path and specific action.
**Sufficient**: No known requirement, acceptance, dependency, or implementation gaps remain unresolved.
**Coherent**: No unresolved ambiguities or internal contradictions.
