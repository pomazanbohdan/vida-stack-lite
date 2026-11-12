---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-build-auto-skill-md-2bb15a7e-c01"
title: "bmad-method: skills/bmad-build-auto/SKILL.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-build-auto/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-build-auto/SKILL.md\"}"
atom_ids:
  - end-the-run-with-an-explicit-terminal-status
  - follow-the-step-sequence-and-halt-at-checkpoints
atom_count: 2
atoms: "[{\"atom_id\":\"end-the-run-with-an-explicit-terminal-status\",\"file_sha256\":\"8b962c5733884bc91c7825c598b603873e0fad06744a9065239d7a6bdb659dc3\",\"content_sha256\":\"bf2ca09d97c70268b5aaf29f18c31df502dcc16c05f905c5f8e0634e518c616f\",\"file_bytes\":2107,\"body_bytes\":503},{\"atom_id\":\"follow-the-step-sequence-and-halt-at-checkpoints\",\"file_sha256\":\"deea0288905ef956025e27cbc467c302f15a7473961af1ba59b65aa53c4dd50d\",\"content_sha256\":\"ca05e90d2c0a5d0c58594ce01d0b14a41d4b4f0c012edced684e089569410f00\",\"file_bytes\":4213,\"body_bytes\":1920}]"
carrier_sha256: a0cfe04bc8add25ebfc40df5908ce75168827f823a02d8ac5bd80758bc8519ab
carrier_bytes: 6619
revision: 1
status: active
---
<!-- vpmodule:atom:begin end-the-run-with-an-explicit-terminal-status -->
---
instruction_id: end-the-run-with-an-explicit-terminal-status
title: End the run with an explicit terminal status
summary: "Every run ends in an explicit status: the reason is reported, the record is written, and the turn is not left waiting for anything."
capability_tags:
  - execute-plan
pattern_tags:
  - unattended-execution
conditions_applies_when: The work cannot continue as it stands.
conditions_does_not_apply_when: The work finished and its result was recorded.
artifact_contract_output_type: terminal-status-report
artifact_contract_required_data:
  - the final status
  - the blocking condition when there is one
  - the record that was written
artifact_contract_verified_by: the run ends with an explicit status and the reason is on record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debug-session-manager.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-debug-session-manager.compact.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/SKILL.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# End the run with an explicit terminal status
`HALT: <reason>`: report the reason and stop.
To HALT with a final status and optional blocking condition.
The only sanctioned way to end a turn is the HALT protocol above with an explicit terminal `status`.
If anything appears below, follow it as the final terminal instruction before exiting; otherwise exit normally.
Follow **On Complete** below, then stop the workflow.

Never return control to the user as if the session were complete when it is not.
<!-- vpmodule:atom:end end-the-run-with-an-explicit-terminal-status -->
<!-- vpmodule:atom:begin follow-the-step-sequence-and-halt-at-checkpoints -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-build-auto/workflow.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-retrospective/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
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
<!-- vpmodule:atom:end follow-the-step-sequence-and-halt-at-checkpoints -->