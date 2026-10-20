---
instruction_id: stop-the-loop-on-its-stated-conditions
title: Stop the loop on its stated conditions
summary: "The loop ends on its stated conditions, and before it ends the run says what the cases do not cover."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
  - experiment-design
conditions_applies_when: A measurement loop over a tool is running.
conditions_does_not_apply_when: The loop was never started.
artifact_contract_output_type: loop-stop
artifact_contract_required_data:
  - the condition that stopped the loop
  - the cases that still fail
  - what the cases do not cover
artifact_contract_verified_by: the stop condition is met and the uncovered ground is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/approaches/eval-loop.md
status: active
revision: 1
---

# Stop the loop on its stated conditions
Every grader passes three runs: done.
The user says it is good enough: done, and tell them which cases still fail.
Two rounds move nothing: the cases are the problem, not the words. Re-examine them for weak assertions, inputs too tidy to fail, or a rubric grading what the bare model already does.
The with-skill arm loses to the bare model and stays behind: the model has caught up. Say so plainly and propose retiring the skill, not patching it.
Before leaving the loop, say in one line what the cases do not cover and whether any assertion passed for a trivial reason. A passing run on easy cases is not proof; the user decides whether to add harder ones.
