---
instruction_id: run-the-steps-without-human-interaction
title: Run the steps without human interaction
summary: "An unattended run asks nothing and waits for no approval: every step decides and records on its own."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: The run has no live person to answer a question or approve a step.
conditions_does_not_apply_when: A person is present and answers within the run.
artifact_contract_output_type: unattended-run-record
artifact_contract_required_data:
  - the questions that were not asked
  - the decisions the run took on its own
artifact_contract_verified_by: no question was asked and no approval was waited for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the steps without human interaction
No human interaction: do not ask questions or wait for approval in this step.
Stop if the intent left out something the user would notice in the result.
If intent gaps exist, do not fantasize and do not leave open questions.
