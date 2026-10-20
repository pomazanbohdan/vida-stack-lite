---
instruction_id: write-a-spec-from-synthesis
title: Write a spec from synthesis
summary: "Turn the current conversation into a spec without interviewing, covering problem, solution, user stories, implementation decisions, testing decisions, out of scope and notes."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The current conversation already contains what a spec must say.
conditions_does_not_apply_when: The requirements are still unknown and need an interview.
artifact_contract_output_type: spec
artifact_contract_required_data:
  - problem
  - solution
  - user stories
  - implementation decisions
  - testing decisions
  - out of scope
artifact_contract_verified_by: the spec contains no file paths or code snippets except decision-rich prototype excerpts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/to-spec/SKILL.md
status: active
revision: 1
---

# Write a spec from synthesis
This skill takes the current conversation context and codebase understanding and produces a spec. Do NOT interview the user; just synthesize what you already know.
1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.
2. Sketch out the seams at which you're going to test the feature.
3. Write the spec using the template below, then publish it to the project issue tracker.
## Problem Statement
The problem that the user is facing, from the user's perspective.
## Solution
The solution to the problem, from the user's perspective.
## User Stories
A LONG, numbered list of user stories. Each user story should be in the format of:
1. As an <actor>, I want a <feature>, so that <benefit>
This list of user stories should be extremely extensive and cover all aspects of the feature.
## Implementation Decisions
A list of implementation decisions that were made. This can include:
- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions
Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.
Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.
## Testing Decisions
A list of testing decisions that were made. Include:
- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)
## Out of Scope
A description of the things that are out of scope for this spec.
## Further Notes
Any further notes about the feature.
