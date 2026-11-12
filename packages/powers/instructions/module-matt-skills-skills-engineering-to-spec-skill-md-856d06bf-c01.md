---
schema: VPInstructionModule/v1
instruction_id: "module-matt-skills-skills-engineering-to-spec-skill-md-856d06bf-c01"
title: "matt-skills: skills/engineering/to-spec/SKILL.md module"
summary: "Carrier for 2 atomic instructions from matt-skills:skills/engineering/to-spec/SKILL.md."
source: "{\"donor\":\"matt-skills\",\"path\":\"skills/engineering/to-spec/SKILL.md\"}"
atom_ids:
  - choose-the-highest-test-seam
  - write-a-spec-from-synthesis
atom_count: 2
atoms: "[{\"atom_id\":\"choose-the-highest-test-seam\",\"file_sha256\":\"9d6ef685751c3173a84eae480d7a149e4f9e5be64c67a4b3a2370c15e6b610ef\",\"content_sha256\":\"c13760ece0a6368fce92ad8527f62289ed59f21d704eaf6558057120ee2d85fa\",\"file_bytes\":1410,\"body_bytes\":380},{\"atom_id\":\"write-a-spec-from-synthesis\",\"file_sha256\":\"0d54dedaaedcfe3079d6d4371ef9594f668e5195ca893d8b2dd52a76f3db97f3\",\"content_sha256\":\"ac7ebebcf7b6f41978761312a8a5b3d3a0d9d38dffae8506860b748302bb2e4f\",\"file_bytes\":3292,\"body_bytes\":2110}]"
carrier_sha256: 2f08f5825e30f9a3f1a5429762bb81edf74658a2bcb4b409dc883c6ace57dc3f
carrier_bytes: 4927
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-highest-test-seam -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/to-spec/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Choose the highest test seam
Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.
Check with the user that these seams match their expectations.
<!-- vpmodule:atom:end choose-the-highest-test-seam -->
<!-- vpmodule:atom:begin write-a-spec-from-synthesis -->
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
  - donor=matt-skills; license=MIT; revision=4ae2317ddb22b046e26455e4f9c9b3aaaf62212d; path=skills/engineering/to-spec/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - product
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
<!-- vpmodule:atom:end write-a-spec-from-synthesis -->