---
instruction_id: choose-the-highest-test-seam
title: Choose the highest test seam
summary: "Prefer existing test seams and use the highest seam possible, aiming for the fewest seams across the codebase."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
  - test-placement-strategy
conditions_applies_when: A spec or plan decides where tests will go.
conditions_does_not_apply_when: The seam is already fixed.
artifact_contract_output_type: seam-choice
artifact_contract_required_data:
  - chosen seams
  - why highest
  - count
artifact_contract_verified_by: the seams were checked with the user and existing seams were preferred
compatibility_excludes:
  - choose-the-test-level
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/to-spec/SKILL.md
status: active
revision: 2
---

# Choose the highest test seam
Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.
Check with the user that these seams match their expectations.
