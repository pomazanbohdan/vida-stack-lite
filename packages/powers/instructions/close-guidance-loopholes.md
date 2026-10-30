---
instruction_id: close-guidance-loopholes
title: Close loopholes explicitly
summary: "Forbid the specific workarounds agents use, add a rationalization table and red flags, and re-test each counter until the rule holds."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The agent bypassed a rule or produced a new rationalization.
conditions_does_not_apply_when: The rule holds stably without new bypasses.
artifact_contract_output_type: closed-loophole
artifact_contract_required_data:
  - rationalization
  - prohibition
  - counter-example
  - re-test
artifact_contract_verified_by: the same scenario re-run after each counter
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/persuasion-principles.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Close loopholes explicitly
Don't just state the rule; forbid specific workarounds.
Skills that enforce discipline need to resist rationalization.
Agents are smart and will find loopholes when under pressure.
Capture rationalizations from baseline testing.
Every excuse agents make goes in the table.
Make it easy for agents to self-check when rationalizing.
Add symptoms of when you are about to violate the rule to the description.
Add the foundational principle early: violating the letter of the rules is violating the spirit of the rules.
This cuts off entire class of "I'm following the spirit" rationalizations.
Agent found a new rationalization? Add an explicit counter.
Re-test until bulletproof.
Build a rationalization table from all test iterations.
Create a red flags list.
Re-test the same scenarios with the updated skill.
Plug holes systematically.
