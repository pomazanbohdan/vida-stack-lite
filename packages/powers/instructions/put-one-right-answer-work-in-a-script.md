---
instruction_id: put-one-right-answer-work-in-a-script
title: Put one-right-answer work in a script
summary: "Work with one right answer per input belongs in a script; work that turns on meaning belongs in prose; a line on the wrong side is a defect, and the test asserts what the script produced."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - structural-design
conditions_applies_when: A line of a skill could be a script or could be prose.
conditions_does_not_apply_when: "The work needs judgment, tone or a decision about meaning."
artifact_contract_output_type: agent-skill
artifact_contract_required_data:
  - the work
  - the side it was put on
  - why
artifact_contract_verified_by: the work comes out the same way on every run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/craft-scripts.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-toolsmith/help/shape-script-utility.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/plain-skill/shape.md
status: active
revision: 2
---

# Put one-right-answer work in a script
A script does work that has one right answer per input: parsing, counting, resolving paths, validating structure, rendering a template, diffing, generating random values.
Prose does work that turns on meaning: judgment, tone, what to do with a result.
A line on the wrong side is a defect the review catches: prose counting tokens or checking structure is paid on every run and done differently each time; a script deciding what a sentence means breaks when the phrasing shifts.
It fits when most of the job has one right answer per input: transforming files, counting, checking structure, generating from fixed rules, resolving paths.
Prose would do that worse and differently every run.
The skill's prose stays for the part that turns on meaning: what to do with the result.
Tests assert what a script produced, never what a model wrote or what a prompt file says.
Three degrees of freedom: prose where the agent judges, a parameterised pattern where a preferred way exists, a script where the sequence is fragile or every run would rewrite the same helper.
