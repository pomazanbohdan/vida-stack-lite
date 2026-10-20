---
instruction_id: test-guidance-against-baseline
title: Test the guidance against baseline behavior
summary: "Establish what the agent does without the guidance, document the rationalizations verbatim, then compare the guided run against that baseline."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "Guidance is being created or changed to alter an executor's behavior."
conditions_does_not_apply_when: The text is pure reference with no rules that can be violated.
artifact_contract_output_type: baseline-scenario
artifact_contract_required_data:
  - scenario
  - baseline choice
  - rationalization
  - re-test
artifact_contract_verified_by: behavior changes between the baseline and guided runs
compatibility_excludes: []
compatibility_requires:
  - close-guidance-loopholes
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/SKILL.md
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/testing-skills-with-subagents.md
status: active
revision: 2
---

# Test the guidance against baseline behavior
Testing skills is just TDD applied to process documentation.
Run scenarios without the skill and watch the agent fail.
Write the skill addressing those failures and watch the agent comply.
Close loopholes and stay compliant.
If you didn't watch an agent fail without the skill, you don't know if the skill prevents the right failures.
Create pressure scenarios with 3+ combined pressures.
Give agents a realistic task with pressures.
Document choices and rationalizations word-for-word.
Identify patterns: which excuses appear repeatedly?
Note effective pressures: which scenarios trigger violations?
This is identical to TDD's "write failing test first".
You must see what agents naturally do before writing the skill.
Run the baseline with no guidance present.
Record the option the agent selects.
Write guidance addressing only the failures you observed.
Compare the baseline run and the guided run.
Behavior must change between the two runs.
Tests pass once does not mean bulletproof.
Continue the refactor cycle until no new rationalizations appear.
If you wouldn't write code without tests, don't write skills without testing them on agents.
