---
instruction_id: treat-your-own-code-as-foreign-when-debugging-it
title: Treat your own code as foreign when you debug it
summary: "Your own code is read as if someone else wrote it: the design decisions are hypotheses and the behaviour of the code is the truth."
capability_tags:
  - debug-root-cause
pattern_tags:
  - adversarial-self-review
conditions_applies_when: The code under investigation was written by the same agent.
conditions_does_not_apply_when: The code was written by someone else.
artifact_contract_output_type: self-audit
artifact_contract_required_data:
  - the design decisions that are questioned
  - the code that was touched
  - the admission that is made
artifact_contract_verified_by: "the implementation decisions are treated as hypotheses, not facts"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-philosophy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Treat your own code as foreign when you debug it
When debugging code you wrote, you're fighting your own mental model.
Treat your code as foreign - Read it as if someone else wrote it
Question your design decisions - Your implementation decisions are hypotheses, not facts
Admit your mental model might be wrong - The code's behavior is truth; your model is a guess
Prioritize code you touched - If you modified 100 lines and something breaks, those are prime suspects
The hardest admission: "I implemented this wrong." Not "requirements were unclear" - YOU made an error.
