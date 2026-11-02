---
instruction_id: lay-out-approaches-before-design
title: Lay out the approaches before the design
summary: "Once the owner's intent is clear, present the real ways to build it in a message of their own, recommend one when several remain, and get their choice before writing the design; when only one way is sensible, say so."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The owner's intent is understood and the work is moving from what they want to how it gets built.
conditions_does_not_apply_when: There is only one sensible way and no real choice to present.
artifact_contract_output_type: approach-options
artifact_contract_required_data:
  - approaches when more than one remains
  - trade-offs for each
  - recommendation and reason when more than one remains
  - owner choice when more than one is presented
artifact_contract_verified_by: the owner chooses among multiple approaches, or the single sensible way is stated and accepted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=2ce8aa15d05bd57213e6f746f953aafb7ded7a8b; path=skills/brainstorming/SKILL.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - design-ux
---

# Lay out the approaches before the design
Once you understand what they want, and before you write anything up, put the ways of building it in a message of their own.
Come up with several real alternatives and drop the weak ones, including any that work against why they want it and any the existing work rules out.
Present the two or three that remain, grounding each in what the project actually does and saying what it trades off.
When you present more than one, recommend one and say why, then ask which way they want to go.
When there's genuinely one sensible way, say so and explain why the others don't fit; no choice is needed.
This is for how it gets built; for what they want, get them describing first.
The chosen approach, or the single sensible way, goes into the design document under Approaches.
