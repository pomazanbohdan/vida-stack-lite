---
instruction_id: critique-the-rubric-alongside-the-grade
title: Critique the rubric alongside the grade
summary: "Grade the expectations and critique them at the same time: name the assertions a wrong output would also pass and the outcomes no assertion covers."
capability_tags:
  - design-experiments
pattern_tags:
  - test-design
conditions_applies_when: A set of expectations is graded against what an output produced.
conditions_does_not_apply_when: The expectations were fixed by someone else and are not being authored here.
artifact_contract_output_type: rubric-critique
artifact_contract_required_data:
  - the weak assertions named
  - the outcomes no assertion covers
artifact_contract_verified_by: the critique names at least the assertions that would also pass for a wrong output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/grader.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - research
---

# Critique the rubric alongside the grade
The grader has a second job that matters as much as the first: it critiques the rubric.
A passing grade on a weak assertion is worse than useless, because it reads as proof while measuring nothing, so the grader flags assertions that a wrong output would also pass and names important outcomes that no assertion covers.
After grading, surface assertions that look weak, meaning ones that passed but would also pass for a clearly wrong output, and name important outcomes you observed, good or bad, that no assertion checks.
Keep the bar at what a rubric author would call a good catch rather than a nit.
