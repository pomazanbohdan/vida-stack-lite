---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-idea-refine-refinement-criteria-md-570f7139-c01"
title: "addy-skills: skills/idea-refine/refinement-criteria.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:skills/idea-refine/refinement-criteria.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/idea-refine/refinement-criteria.md\"}"
atom_ids:
  - rank-directions-by-value-and-feasibility
  - scope-an-mvp-to-one-job-and-its-riskiest-assumption
  - separate-a-painkiller-from-a-vitamin
  - test-for-durable-differentiation
  - test-technical-and-resource-feasibility
atom_count: 5
atoms: "[{\"atom_id\":\"rank-directions-by-value-and-feasibility\",\"file_sha256\":\"72c477a14b41f01a3c97914380dc192b4398dce47b68ce94ca45aa9313c364cf\",\"content_sha256\":\"0d7c8f60dd44d5db600e1036f4881d413594f58bf13988663afc134989d4acd5\",\"file_bytes\":1641,\"body_bytes\":431},{\"atom_id\":\"scope-an-mvp-to-one-job-and-its-riskiest-assumption\",\"file_sha256\":\"a510c40358c0fcdb0edaaced9e7af7e73372501e74eaf0e06571a578181ed4c9\",\"content_sha256\":\"4bf95a42c356e85c01887cf3136234a12a981a58b13861bf1015028d9c54e8e0\",\"file_bytes\":1785,\"body_bytes\":587},{\"atom_id\":\"separate-a-painkiller-from-a-vitamin\",\"file_sha256\":\"864e43b9a1a1fa8850c4fb79d14ce49bf93abfd1909fd43d6a7bc2d363d6a0dc\",\"content_sha256\":\"71e090cfd1545c8a56528e3f91094d1524d6bf2fc6b792fd22462479dd7641c0\",\"file_bytes\":2489,\"body_bytes\":1283},{\"atom_id\":\"test-for-durable-differentiation\",\"file_sha256\":\"0b60622f375a7bc135d2a018e42c58a097ffa360d38d2e04f80b354a9e8f1381\",\"content_sha256\":\"c4ee3700da7e012093a5594f23369875e4a931eb5d6b3beb30991ab812e267df\",\"file_bytes\":2439,\"body_bytes\":1215},{\"atom_id\":\"test-technical-and-resource-feasibility\",\"file_sha256\":\"1516f1981eded2ada9a08517cbba3dacfaab0a5a998d4876edc012f4376cc8e4\",\"content_sha256\":\"e50545d628f2e111f1f036cf1e7e95839aab2f78d14a7f71e528d4d1e75e4d22\",\"file_bytes\":2266,\"body_bytes\":1049}]"
carrier_sha256: e28010e888f7a4a71e2718a65a32b2eca4b6064c6dc44a37bfe50c80f19c7183
carrier_bytes: 11305
revision: 1
status: active
---
<!-- vpmodule:atom:begin rank-directions-by-value-and-feasibility -->
---
instruction_id: rank-directions-by-value-and-feasibility
title: Rank the directions by value and feasibility
summary: Place every direction on a value-by-feasibility matrix and use differentiation to break a tie inside one quadrant.
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Two or more directions have survived evaluation and one has to be chosen.
conditions_does_not_apply_when: Only one direction is on the table.
artifact_contract_output_type: direction-ranking
artifact_contract_required_data:
  - the quadrant of each direction
  - the order the directions are taken in
  - the tiebreak where two share a quadrant
artifact_contract_verified_by: each direction sits in a quadrant and the tiebreak is differentiation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body gives a generic value-feasibility matrix without identifying the subject domain of the directions.
---

# Rank the directions by value and feasibility

When choosing between directions, rank on this matrix:

|                    | High Feasibility | Low Feasibility |
|--------------------|-------------------|-----------------|
| **High Value**     | Do this first     | Worth the risk   |
| **Low Value**      | Only if trivial   | Don't do this    |

Then use differentiation as the tiebreaker between options in the same quadrant.
<!-- vpmodule:atom:end rank-directions-by-value-and-feasibility -->
<!-- vpmodule:atom:begin scope-an-mvp-to-one-job-and-its-riskiest-assumption -->
---
instruction_id: scope-an-mvp-to-one-job-and-its-riskiest-assumption
title: Scope the MVP to one job and its riskiest assumption
summary: "Define the smallest version that does one user job well and tests the assumption most likely to be wrong, and time-box it instead of listing features."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: The chosen direction has to be turned into a first version.
conditions_does_not_apply_when: The direction is still being evaluated and no version has been chosen.
artifact_contract_output_type: mvp-scope
artifact_contract_required_data:
  - the one user job the MVP nails
  - the assumption it tests
  - the time box
  - what is in and what is out
artifact_contract_verified_by: "the scope names one job, the riskiest assumption and a time box"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Scope the MVP to one job and its riskiest assumption

When defining MVP scope for the chosen direction:

1. **One job, done well.** The MVP should nail exactly one user job. Not three jobs done partially.
2. **The riskiest assumption first.** The MVP's primary purpose is to test the assumption most likely to be wrong.
3. **Time-box, not feature-list.** "What can we build and test in [timeframe]?" is better than "What features do we need?"
4. **If it's not embarrassing, you waited too long.** The first version should feel incomplete to the builder. If it doesn't, you over-built.
<!-- vpmodule:atom:end scope-an-mvp-to-one-job-and-its-riskiest-assumption -->
<!-- vpmodule:atom:begin separate-a-painkiller-from-a-vitamin -->
---
instruction_id: separate-a-painkiller-from-a-vitamin
title: Separate a painkiller from a vitamin
summary: "Judge the user value by whether the problem is acute and frequent, not by how good the result sounds."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has to be judged on the value it delivers to its user.
conditions_does_not_apply_when: The user value was already established with named people and a known frequency.
artifact_contract_output_type: value-assessment
artifact_contract_required_data:
  - the painkiller or vitamin verdict
  - the named people who have the problem
  - what they do today instead
  - how often the problem occurs
artifact_contract_verified_by: three specific people with the problem can be named and the verdict rests on frequency and switching
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
  - research
---

# Separate a painkiller from a vitamin

The most important dimension. If the value isn't clear, nothing else matters.

**Painkiller vs. Vitamin:**

- **Painkiller:** Solves an acute, frequent problem. Users will actively seek this out. They'll switch from their current solution. Signs: people describe the problem with emotion, they've built workarounds, they'll pay for a solution.
- **Vitamin:** Nice to have. Makes something marginally better. Users won't go out of their way. Signs: people nod politely, say "that's cool," then don't change behavior.

**Questions to ask:**

- Can you name 3 specific people who have this problem right now?
- What are they doing today instead? (The real competitor is always the current workaround.)
- Would they switch from their current approach? What would make them switch?
- How often do they encounter this problem? (Daily problems > monthly problems)
- Is this a "pull" problem (users are asking for this) or a "push" problem (you think they should want this)?

**Red flags:**

- "Everyone could use this" — if you can't name a specific user, the value isn't clear
- "It's like X but better" — marginal improvements rarely drive adoption
- The problem is real but rare — high intensity but low frequency rarely justifies a product
<!-- vpmodule:atom:end separate-a-painkiller-from-a-vitamin -->
<!-- vpmodule:atom:begin test-for-durable-differentiation -->
---
instruction_id: test-for-durable-differentiation
title: Test for durable differentiation
summary: "Judge the direction by what is genuinely different, not merely better, and by whether a competitor could copy it in a week."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: A direction has to be judged on whether it is worth switching to.
conditions_does_not_apply_when: The direction is a direct improvement of something the user already uses.
artifact_contract_output_type: differentiation-assessment
artifact_contract_required_data:
  - the one thing this does that nothing else does
  - the type of differentiation
  - how long a competitor needs to copy it
artifact_contract_verified_by: the single different thing is named and its type is placed on the strongest-to-weakest scale
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
  - product
  - business
  - research
---

# Test for durable differentiation

What makes this genuinely different? Not better — *different*.

**Questions to ask:**

- If a user described this to a friend, what would they say? Is that description compelling?
- What's the one thing this does that nothing else does? (If you can't name one, that's a problem.)
- Is this differentiation durable? Can a competitor copy it in a week?
- Is the difference something users actually care about, or just something builders find interesting?

**Types of differentiation (strongest to weakest):**

1. **New capability:** Does something that was previously impossible
2. **10x improvement:** So much better on a key dimension that it changes behavior
3. **New audience:** Brings an existing capability to people who were excluded
4. **New context:** Works in a situation where existing solutions fail
5. **Better UX:** Same capability, dramatically simpler experience
6. **Cheaper:** Same thing, lower cost (weakest — easily competed away)

**Red flags:**

- Differentiation is entirely about technology, not user experience
- "We're faster/cheaper/prettier" without a structural reason why
- The feature that differentiates is not the feature users care most about
<!-- vpmodule:atom:end test-for-durable-differentiation -->
<!-- vpmodule:atom:begin test-technical-and-resource-feasibility -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/refinement-criteria.md
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
<!-- vpmodule:atom:end test-technical-and-resource-feasibility -->