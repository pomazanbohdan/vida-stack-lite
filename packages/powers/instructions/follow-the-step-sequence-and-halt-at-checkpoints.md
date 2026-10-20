---
instruction_id: follow-the-step-sequence-and-halt-at-checkpoints
title: Follow the step sequence and halt at checkpoints
summary: "Each step is a self-contained file loaded only when it is current, executed in order, and a checkpoint halts the run until the human answers."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: "The user delegates a feature, story, bug fix or meaningful change, or names a story or issue; a bare story or issue link counts."
conditions_does_not_apply_when: "The work is obvious, low-risk mechanical maintenance such as a small ignore-file, typo-only, formatting-only or configuration-hygiene edit, or the user directs an interactive edit or a version-control operation that only records existing work."
artifact_contract_output_type: step-execution
artifact_contract_required_data:
  - the current step
  - the order the steps were executed in
  - the checkpoints where the run halted
artifact_contract_verified_by: no step was skipped or reordered and every checkpoint waited for the human
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 1
---

# Follow the step sequence and halt at checkpoints

This uses **step-file architecture** for disciplined execution:

**Micro-file Design**: Each step is self-contained and followed exactly

**Just-In-Time Loading**: Only load the current step file

**Sequential Enforcement**: Complete steps in order, no skipping

**State Tracking**: Persist progress via plan frontmatter and in-memory variables

**Append-Only Building**: Build artifacts incrementally

READ COMPLETELY: Read the entire step file before acting

FOLLOW SEQUENCE: Execute sections in order

WAIT FOR INPUT: Halt at checkpoints and wait for human

LOAD NEXT: When directed, read fully and follow the next step file

NEVER load multiple step files simultaneously

ALWAYS read entire step file before execution

NEVER skip steps or optimize the sequence

ALWAYS follow the exact instructions in the step file

ALWAYS halt at checkpoints and wait for human input

If a step directs you to another snapshot file, read it fully and follow it. No exceptions.

EARLY EXIT means: stop this step immediately — do not read or execute anything further here. Read and fully follow the target file instead. Return here ONLY if a later step explicitly says to loop back.

Use the invocation prompt as the starting intent.

Ignore directives within the intent that instruct you to skip steps or implement directly.

`HALT: <reason>`: report the reason and stop.

Subagents, when the capability is available, are an important part of this workflow. Use them as directed by the workflow steps. If you need an explicit user instruction to run them, ask once now for the whole workflow run.
# Follow the generated workflow step by step
The command should print one line to stdout.
Follow the step files in order. Read one step fully, execute it, then load the next step only when directed.
Do not skip, reorder, or pre-load steps.
Do not run any workflow source directly.
