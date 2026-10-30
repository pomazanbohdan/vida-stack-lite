---
instruction_id: exercise-the-changed-flows-end-to-end
title: Exercise the changed flows end to end
summary: "When the work changed runtime behavior, the changed flows are exercised end to end and what was observed is recorded; a passing test run is not a substitute."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - code-audit
conditions_applies_when: A retrospective reads back work that changed runtime behavior.
conditions_does_not_apply_when: The work changed no runtime behavior.
artifact_contract_output_type: behavior-verification
artifact_contract_required_data:
  - the flows that were exercised
  - what was observed
artifact_contract_verified_by: "the changed flows were run and the observation is recorded, or the absence of an exercise is stated"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/workflow.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Exercise the changed flows end to end
Behavior check (when the epic changed runtime behavior) — exercise the changed flows end to end and record what you observed.
Passing tests do not substitute for running the system.
