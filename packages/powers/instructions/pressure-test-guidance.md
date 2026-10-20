---
instruction_id: pressure-test-guidance
title: Test the guidance under pressure
summary: "Run realistic pressured scenarios against a no-guidance baseline, compare compliance, and close the rationalizations that break through."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "The guidance must hold behavior under pressure, not only describe a process."
conditions_does_not_apply_when: The guidance is pure reference with no rules that can be violated.
artifact_contract_output_type: pressure-test
artifact_contract_required_data:
  - scenario
  - pressures
  - worker choice
  - correction
artifact_contract_verified_by: the guidance holds under a pressured scenario
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/writing-skills/examples/CLAUDE_MD_TESTING.md
status: active
revision: 2
---

# Test the guidance under pressure
Run the null baseline first, with no guidance present.
Record which option the agent chooses.
Capture the exact rationalizations.
Run the same scenario with the guidance present.
Check whether the agent checks for and uses the guidance.
Add time pressure.
Add sunk cost.
Add authority pressure.
Document when compliance breaks down.
Ask the agent how to improve the document: "You had the doc but didn't check. Why?"
Compare compliance rates.
Identify which rationalizations break through.
Iterate on the winning variant to close holes.
The variant succeeds if the agent checks for guidance unprompted.
The agent must read the guidance completely before acting.
The agent must follow the guidance under pressure.
The variant fails if the agent skips checking even without pressure.
The variant fails if the agent adapts the concept without reading.
The variant fails if the agent rationalizes away under pressure.
