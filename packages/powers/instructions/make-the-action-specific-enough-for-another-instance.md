---
instruction_id: make-the-action-specific-enough-for-another-instance
title: Make the action specific enough for another instance
summary: An action is specific enough when another instance could execute it without asking a clarifying question.
capability_tags:
  - plan-implementation
pattern_tags:
  - testable-criteria
conditions_applies_when: A task action is written.
conditions_does_not_apply_when: The action is a single mechanical edit with no ambiguity.
artifact_contract_output_type: action-text
artifact_contract_required_data:
  - the action
  - the nouns it names
  - the verbs it states
artifact_contract_verified_by: another instance could execute the action without asking a question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 1
---

# Make the action specific enough for another instance
**Specificity test:** Could a different Claude instance execute the task without asking clarifying questions? If not, add more detail
For each `<action>` step, re-read it as if you have NEVER seen this codebase. Is every noun unambiguous (which file? which function? which endpoint?)? Is every verb specific (add WHERE? modify HOW?)? If a step could be interpreted two ways, rewrite it. Include file paths, function names, and expected behavior in every action step
