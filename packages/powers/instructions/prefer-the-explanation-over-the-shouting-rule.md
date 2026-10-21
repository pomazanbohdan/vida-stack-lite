---
instruction_id: prefer-the-explanation-over-the-shouting-rule
title: Prefer the explanation over the shouting rule
summary: A stack of MUSTs and ALWAYS is read as a symptom of a fix that patches the case; a sharper outcome statement or a worked example generalises where a louder rule does not.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
  - rule-authority-policy
conditions_applies_when: A proposed fix to an instruction is stated as a rule the model cannot miss.
conditions_does_not_apply_when: The rule states a hard boundary the model is allowed to enforce.
artifact_contract_output_type: rule-tone-choice
artifact_contract_required_data:
  - the shouted form
  - the form that explains the reasoning
artifact_contract_verified_by: the chosen form states the outcome instead of commanding it
compatibility_excludes:
  - write-directive-rules
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/self-improvement.md
status: active
revision: 2
---

# Prefer the explanation over the shouting rule
When a proposed fix reaches for ALL-CAPS ALWAYS or NEVER or a stack of MUSTs, treat that as a warning sign.
Shouting at the model is usually a sign the fix is patching a symptom; a sharper outcome statement or a small worked example generalizes where a louder rule does not.
Prefer the version that explains the reasoning over the version that issues the command.
