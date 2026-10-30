---
instruction_id: leave-a-runtime-choice-in-the-text
title: Leave a runtime choice in the text
summary: A value the agent decides while running stays as prose with its alternatives; only values fixed before the render are rendered.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A decision is written into a workflow or a template.
conditions_does_not_apply_when: The value is already fixed before the run starts.
artifact_contract_output_type: decision-placement
artifact_contract_required_data:
  - the value
  - who decides it
  - where the alternatives stay
artifact_contract_verified_by: no value the agent decides at run time is resolved before the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=AGENTS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Leave a runtime choice in the text
Leave runtime choices as prose: when the model decides a value while running, the alternatives stay in the text.
Render-time conditionals are only for values fixed before the render.
