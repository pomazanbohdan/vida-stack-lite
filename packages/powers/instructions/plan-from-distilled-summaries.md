---
instruction_id: plan-from-distilled-summaries
title: Plan from distilled summaries
summary: "Narrow work is read directly; deep exploration goes to a subagent that returns only a distilled summary, and the plan is written from that summary."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The planning needs an exploration that is larger than the plan itself.
conditions_does_not_apply_when: The task is narrow and localized and can be read directly.
artifact_contract_output_type: planning-context
artifact_contract_required_data:
  - the findings that mattered
  - "the files, symbols and reuse points carried forward"
artifact_contract_verified_by: the plan holds the findings instead of the raw exploration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-02-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Plan from distilled summaries
Read the code yourself for narrow, localized tasks.
Isolate deep exploration in synchronous subagents: instruct them to give you distilled summaries only, and plan from those summaries.
This is where the investigation lands: the plan preserves it so it is never re-narrated to the implementer at dispatch time.
