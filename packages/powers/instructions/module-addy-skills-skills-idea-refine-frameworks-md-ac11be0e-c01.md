---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-idea-refine-frameworks-md-ac11be0e-c01"
title: "addy-skills: skills/idea-refine/frameworks.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:skills/idea-refine/frameworks.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/idea-refine/frameworks.md\"}"
atom_ids:
  - impose-a-constraint-to-force-solutions
  - look-for-structural-analogies
  - name-the-job-the-user-is-hiring-it-for
  - run-a-pre-mortem-on-the-idea
  - transform-an-idea-with-seven-operations
atom_count: 5
atoms: "[{\"atom_id\":\"impose-a-constraint-to-force-solutions\",\"file_sha256\":\"1b04992ea99d06709c32ca72481d1afa878ff7bd0c02315d7e088aace0521a5e\",\"content_sha256\":\"c05265826e46e890521f41e5885fc9e27898f7aa7d5fa467f43c9f932a19909f\",\"file_bytes\":1613,\"body_bytes\":549},{\"atom_id\":\"look-for-structural-analogies\",\"file_sha256\":\"bb326eb953e36a178ff7c5a85b8f6f8135d0b89d600f47737f7cb64cd1012655\",\"content_sha256\":\"e6a144d692a0adcb9ad5f0e1f313d5dc2109ca80648f72276d6fd681f53cce6b\",\"file_bytes\":1542,\"body_bytes\":478},{\"atom_id\":\"name-the-job-the-user-is-hiring-it-for\",\"file_sha256\":\"f384350e22c83b0af5d8d3e5b486db6d72361f4261fc543c4c1cdb3f9e26ad5c\",\"content_sha256\":\"76360646baa42ba37f45914d7d7570411a78e02b36ee006bfca666e0b9dcd82e\",\"file_bytes\":1743,\"body_bytes\":563},{\"atom_id\":\"run-a-pre-mortem-on-the-idea\",\"file_sha256\":\"395c6bd276d39f656e72c057bbf0633271d3d66cec560780a5187df8166befd7\",\"content_sha256\":\"92d80a540862800b37c1695201513a63844f487f29178b37e3d400e43dedaec8\",\"file_bytes\":1566,\"body_bytes\":418},{\"atom_id\":\"transform-an-idea-with-seven-operations\",\"file_sha256\":\"d8b5420411be01ed19781014d63bd1260fe4fe53c456fcab1cc7becce1cb77d7\",\"content_sha256\":\"af155a9a68a426737b35df100b2b92d4e3d115bb9c53ea553a141c496d3a58a5\",\"file_bytes\":2372,\"body_bytes\":1235}]"
carrier_sha256: 1f36abf5f8023345492b333520ef9a6356140feed7e3cb489e5400a76f58c3f3
carrier_bytes: 9469
revision: 1
status: active
---
<!-- vpmodule:atom:begin impose-a-constraint-to-force-solutions -->
---
instruction_id: impose-a-constraint-to-force-solutions
title: Impose a constraint to force solutions
summary: "Deliberately impose a time, feature, technology, cost, audience or scale constraint to force creative solutions."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The idea has grown too large or too vague and needs to be cut through.
conditions_does_not_apply_when: The idea is already sharply scoped.
artifact_contract_output_type: constraint-set
artifact_contract_required_data:
  - the constraint imposed
  - the solutions it forced
artifact_contract_verified_by: the constraint is stated and the idea was solved inside it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - business
  - engineering
---

# Impose a constraint to force solutions

Deliberately impose constraints to force creative solutions:

- **Time constraint:** "What if you only had 1 day to build this?"
- **Feature constraint:** "What if it could only have one feature?"
- **Tech constraint:** "What if you couldn't use [the obvious technology]?"
- **Cost constraint:** "What if it had to be free forever?"
- **Audience constraint:** "What if your user had never used a computer before?"
- **Scale constraint:** "What if it needed to work for 1 billion users? What about just 10?"
<!-- vpmodule:atom:end impose-a-constraint-to-force-solutions -->
<!-- vpmodule:atom:begin look-for-structural-analogies -->
---
instruction_id: look-for-structural-analogies
title: Look for structural analogies
summary: "Find how other domains solved the same shape of problem, and copy the structure rather than the surface."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: The obvious approach has to be left behind for variations that feel genuinely different.
conditions_does_not_apply_when: The variation only has to refine what already exists.
artifact_contract_output_type: analogy-set
artifact_contract_required_data:
  - the domain or precedent used
  - the structural similarity it carries
artifact_contract_verified_by: "each analogy is structural, not a surface-level comparison"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Look for structural analogies

Look at how other domains solved similar problems:

- What industry has already solved a version of this problem?
- What would this look like if [specific company/product] built it?
- What natural system works this way?
- What historical precedent exists?

The key is finding *structural* similarities, not surface-level ones. "Uber for X" is surface-level. "A two-sided marketplace that solves a trust problem between strangers" is structural.
<!-- vpmodule:atom:end look-for-structural-analogies -->
<!-- vpmodule:atom:begin name-the-job-the-user-is-hiring-it-for -->
---
instruction_id: name-the-job-the-user-is-hiring-it-for
title: Name the job the user is hiring it for
summary: "Describe the functional, emotional and social job the user is trying to get done, not the solution they asked for."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: It is unclear whether the request solves the right problem.
conditions_does_not_apply_when: "The problem to solve is already stated in the user's own terms."
artifact_contract_output_type: job-statement
artifact_contract_required_data:
  - the functional job
  - the emotional job
  - the social job
  - "the situation, motivation and expected outcome"
artifact_contract_verified_by: "the job statement is written in the situation, motivation and outcome form and names all three job kinds"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - research
---

# Name the job the user is hiring it for

Focus on what the user is trying to accomplish, not what they say they want:

- **Functional job:** What task are they trying to complete?
- **Emotional job:** How do they want to feel?
- **Social job:** How do they want to be perceived?

Format: "When I [situation], I want to [motivation], so I can [expected outcome]."

**Key insight:** People don't buy products — they hire them to do a job. The competing product isn't always in the same category. (Netflix competes with sleep, not just other streaming services.)
<!-- vpmodule:atom:end name-the-job-the-user-is-hiring-it-for -->
<!-- vpmodule:atom:begin run-a-pre-mortem-on-the-idea -->
---
instruction_id: run-a-pre-mortem-on-the-idea
title: Run a pre-mortem on the idea
summary: "Imagine the idea already failed and work backwards to the failure modes, and to which of them you are willing to accept."
capability_tags:
  - design-experiments
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A direction feels good but has not been pressure-tested.
conditions_does_not_apply_when: The direction was already pressure-tested against its failure modes.
artifact_contract_output_type: pre-mortem
artifact_contract_required_data:
  - the plausible reasons for failure
  - "for each: whether it is preventable"
  - the failure modes you are willing to accept
artifact_contract_verified_by: every failure mode is either accepted by name or marked as a signal to change the idea
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - business
---

# Run a pre-mortem on the idea

Imagine the idea has already failed. Work backwards:

1. It's 12 months from now. The project shipped and flopped. What went wrong?
2. List every plausible reason for failure — technical, market, team, timing
3. For each failure mode: Is this preventable? Is this a signal the idea needs to change?
4. Which failure modes are you willing to accept? Which ones would kill the project?
<!-- vpmodule:atom:end run-a-pre-mortem-on-the-idea -->
<!-- vpmodule:atom:begin transform-an-idea-with-seven-operations -->
---
instruction_id: transform-an-idea-with-seven-operations
title: Transform an idea with seven operations
summary: "Transform an existing idea by substituting, combining, adapting, modifying, reusing, eliminating and reversing parts of it."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: An existing product or feature has to be reimagined rather than started from nothing.
conditions_does_not_apply_when: The idea is greenfield and no existing thing is being improved.
artifact_contract_output_type: idea-transformations
artifact_contract_required_data:
  - the seven operations
  - the transformed result of each operation that produced one
artifact_contract_verified_by: each transformation names the operation it came from
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/idea-refine/frameworks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - product
  - business
---

# Transform an idea with seven operations

A structured way to transform an existing idea by applying seven different operations:

- **Substitute:** What component, material, or process could you swap out? What if you replaced the core technology? The target audience? The business model?
- **Combine:** What if you merged this with another product, service, or idea? What two things that don't usually go together would create something new?
- **Adapt:** What else is like this? What ideas from other industries, domains, or time periods could you borrow? What parallel exists in nature?
- **Modify (Magnify/Minimize):** What if you made it 10x bigger? 10x smaller? What if you exaggerated one feature? What if you stripped it to the absolute minimum?
- **Put to other uses:** Who else could use this? What other problems could it solve? What happens if you use it in a completely different context?
- **Eliminate:** What happens if you remove a feature entirely? What's the version with zero configuration? What would it look like with half the steps?
- **Reverse/Rearrange:** What if you did the steps in the opposite order? What if the user did the work instead of the system (or vice versa)? What if you reversed the value chain?
<!-- vpmodule:atom:end transform-an-idea-with-seven-operations -->