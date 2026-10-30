---
instruction_id: finish-the-activation-steps-before-the-main-work
title: Finish the activation steps before the main work
summary: "Run every activation step in the declared order, confirm that each one ran, and only then start the work itself."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The run declares activation steps that come before the main work.
conditions_does_not_apply_when: The work has no activation steps.
artifact_contract_output_type: activation-checklist
artifact_contract_required_data:
  - the activation steps
  - the confirmation that each one ran
artifact_contract_verified_by: the main work started only after every activation step was confirmed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-spec/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Finish the activation steps before the main work
Activation is complete.
Confirm every entry was executed in order before proceeding.
Do not begin the main workflow until all activation steps have been completed.
Execute each entry in
the configured activation steps
in order.
