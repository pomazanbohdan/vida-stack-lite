---
instruction_id: make-the-step-halt-where-the-menu-is
title: Make the step halt where the menu is
summary: A step that offers a menu says in the same section that it stops and waits for the answer.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A step of a workflow presents a menu of choices to the user.
conditions_does_not_apply_when: The step runs unattended and offers no choice.
artifact_contract_output_type: step-rule
artifact_contract_required_data:
  - the menu
  - the halt statement in the same section
  - what the step waits for
artifact_contract_verified_by: the section that holds the menu also holds the halt and the wait
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/skill-validator.md
status: active
revision: 1
---

# Make the step halt where the menu is
Any step that presents a user menu (e.g., `[C] Continue`, `[A] Approve`, `[S] Split`) must explicitly HALT and wait for user response before proceeding.
Find menu patterns (bracketed letter options).
Check that text within the same section (under the same heading) includes "HALT", "wait", "stop", "FORBIDDEN to proceed", or equivalent.
Add an explicit HALT instruction before or after the menu.
