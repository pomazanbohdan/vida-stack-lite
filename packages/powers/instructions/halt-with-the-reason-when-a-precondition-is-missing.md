---
instruction_id: halt-with-the-reason-when-a-precondition-is-missing
title: Halt with the reason when a precondition is missing
summary: "When the run lacks what it needs, stop with the reason named instead of guessing forward."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: "A precondition of the work is missing: the trigger, the evidence, the impact analysis, the approval or the owner of the change."
conditions_does_not_apply_when: Everything the run needs is present.
artifact_contract_output_type: halted-run
artifact_contract_required_data:
  - the missing precondition
  - the reason
  - the blocking items
artifact_contract_verified_by: the run stopped with the reason named and the blocking items listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/checklist.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-correct-course/SKILL.md
status: active
revision: 1
---

# Halt with the reason when a precondition is missing
Identify blocking issues and work with user to resolve before continuing
HALT: "Cannot proceed without understanding what caused the need for change"
HALT: "Need concrete evidence or examples of the issue before analyzing impact"
HALT: "Cannot proceed to proposal without complete impact analysis"
HALT: "Must have explicit approval before implementing changes"
HALT: "Must clearly define who will execute the proposed changes"
HALT: "Need access to a PRD or a spec to assess change impact. Please ensure one is accessible. Architecture and UI/UX will be used if available."
