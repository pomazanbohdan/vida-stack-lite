---
instruction_id: turn-an-observation-into-an-instruction-not-a-description-of-the-user
title: "Turn an observation into an instruction, not a description of the user"
summary: A finding about how somebody works is written as the directive that follows from it; the description of the person is not the deliverable.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: An observation about a reader or a user is turned into guidance for an agent.
conditions_does_not_apply_when: The observation is the deliverable and no guidance is derived from it.
artifact_contract_output_type: derived-guidance
artifact_contract_required_data:
  - the directive
  - the observation it came from
artifact_contract_verified_by: "the guidance reads as something that can be followed, not as a description of the person"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Turn an observation into an instruction, not a description of the user
**MUST be imperative**: "Provide concise explanations with code" not "You tend to prefer brief explanations"
claude_instruction fields must be imperative directives, not descriptions -- the profile is an instruction document for Claude's consumption
