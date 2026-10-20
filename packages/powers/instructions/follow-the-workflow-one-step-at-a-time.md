---
instruction_id: follow-the-workflow-one-step-at-a-time
title: Follow the workflow one step at a time
summary: "Read each step fully when you reach it, stop where a step shows a menu or a checkpoint, and report the reason when the workflow halts."
capability_tags:
  - execute-plan
pattern_tags:
  - progressive-disclosure
conditions_applies_when: A run follows a workflow whose steps point at further files.
conditions_does_not_apply_when: The work is a single step with no further file to load.
artifact_contract_output_type: workflow-progress
artifact_contract_required_data:
  - the step that was reached
  - the next step
artifact_contract_verified_by: "no step is skipped, a menu or a checkpoint stops the run, and a halt reason is reported"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/shape.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/assets/step.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/assets/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/assets/SKILL-template.md
status: active
revision: 2
---

# Follow the workflow one step at a time
When a step directs you to another file, read it fully and follow it. Load one step at a time, when it is reached.
A step that shows a menu or checkpoint halts there and waits for the user.
The workflow hands you a document.
Read that file and follow it.
`HALT: <reason>`: report the reason and stop.
Each step is loaded when reached, says at the top what it produces, and ends by naming the next step or by saying the workflow is complete.
The last line is one of these two.
The entry point does one thing: run the render, map the words of the invocation to the chosen values, follow the printed workflow, and halt on any failure.
The templating lives only in the workflow and the steps.
