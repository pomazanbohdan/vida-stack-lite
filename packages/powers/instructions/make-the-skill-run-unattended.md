---
instruction_id: make-the-skill-run-unattended
title: Make the skill run unattended
summary: "The single-shot run needs the skill to produce its deliverable without stopping to ask, which means triggering its unattended path from the input."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A skill is run in one shot and it would normally stop to ask a question.
conditions_does_not_apply_when: A human is in the loop and answers the questions.
artifact_contract_output_type: unattended-path
artifact_contract_required_data:
  - the trigger put in the input
  - the context that answers the questions
artifact_contract_verified_by: the run reaches the deliverable without a question being asked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/eval-format.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Make the skill run unattended
Single-shot modes need the skill to produce its deliverable without stopping to ask.
Most multi-turn skills expose a headless flag or keyword that suppresses clarifying questions and ends with a structured status block.
Trigger it from the input: the literal `Run headless.` at the start, a skill-specific keyword from the skill's own headless section, or enough context that no clarification is genuinely needed.
The `state_prefix` also helps here, because a turn that already supplies the answer the skill would ask for keeps the run moving.
If a skill has no headless path and the input cannot satisfy its questions, either add a headless mode to the skill or accept that this case needs a human in the loop.
