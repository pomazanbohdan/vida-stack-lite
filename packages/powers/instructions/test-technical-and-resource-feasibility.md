---
instruction_id: test-technical-and-resource-feasibility
title: Test the technical and resource feasibility
summary: "Judge whether the idea can actually be built, by checking the hard technical part, the resources it needs and how fast value can arrive."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has to be judged on whether it can be built at all.
conditions_does_not_apply_when: The direction was already reduced to a working prototype.
artifact_contract_output_type: feasibility-assessment
artifact_contract_required_data:
  - the hardest technical problem
  - the minimum stack and effort
  - the time to first value
  - the critical path
artifact_contract_verified_by: "the hardest part, the dependencies and the time to value are named"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
  - business
  - research
  - operations
---

# Test the technical and resource feasibility

Can you actually build this? Not just technically, but practically.

**Technical feasibility:**

- Does the core technology exist and work reliably?
- What's the hardest technical problem? Is it a known-hard problem or a novel one?
- Are there dependencies on third parties, APIs, or data sources you don't control?
- What's the minimum technical stack needed? (If the answer is "a lot," that's a signal.)

**Resource feasibility:**

- What's the minimum team/effort to build an MVP?
- Does it require specialized expertise you don't have?
- Are there regulatory, legal, or compliance requirements?

**Time-to-value:**

- How quickly can you get something in front of users?
- Is there a version that delivers value in days/weeks, not months?
- What's the critical path? What has to happen first?

**Red flags:**

- "We just need to solve [very hard research problem] first"
- Multiple dependencies that all need to work simultaneously
- MVP still requires months of work — likely not minimal enough
