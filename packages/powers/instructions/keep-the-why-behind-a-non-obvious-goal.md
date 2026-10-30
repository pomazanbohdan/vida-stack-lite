---
instruction_id: keep-the-why-behind-a-non-obvious-goal
title: Keep the why behind a non-obvious goal
summary: "A rule carries the failure it prevents, so it can reach the case its author never saw; a stripped why is under-writing, not leanness."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A rule is written for a goal the model cannot infer.
conditions_does_not_apply_when: The goal is self-evident and the rule needs no reason.
artifact_contract_output_type: rule-with-reason
artifact_contract_required_data:
  - the rule
  - the failure it prevents
artifact_contract_verified_by: "the rule names the failure it prevents once, in plain words"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/canon.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/lenses/lens-leanness.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Keep the why behind a non-obvious goal
Keep the why behind a non-obvious goal. Without its reason a rule cannot reach the case you did not foresee. A stripped why is under-writing, not leanness.
ALL-CAPS MUST, ALWAYS and NEVER mean the prompt is patching a symptom the author once saw. A model braces against a command and applies it literally; a rule with its reason survives the case the author did not foresee. Write the failure the rule prevents, once.
A stripped why: a non-obvious rule with no reason, so it cannot reach the unforeseen case. Minor; under-writing, not leanness.
