---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-templates-research-project-architecture-md-829402d3-c01"
title: "gsd-core: gsd-core/templates/research-project/ARCHITECTURE.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/templates/research-project/ARCHITECTURE.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/templates/research-project/ARCHITECTURE.md\"}"
atom_ids:
  - say-what-breaks-first-not-the-theoretical-limit
  - write-an-anti-pattern-with-what-to-do-instead
atom_count: 2
atoms: "[{\"atom_id\":\"say-what-breaks-first-not-the-theoretical-limit\",\"file_sha256\":\"2e88e1ff48e2c1bc31551372ba43fd0f93674faca094f72dd8bea0ee62dbee24\",\"content_sha256\":\"fc85acd1b23f997ef58e7cbb3550d9f90d1e34409d39344c7dfe6b52d277fa4e\",\"file_bytes\":1348,\"body_bytes\":280},{\"atom_id\":\"write-an-anti-pattern-with-what-to-do-instead\",\"file_sha256\":\"2f2a305917e102b16d0ce715d454307789819540f20305d2938a049773a80bd1\",\"content_sha256\":\"72e9d7633a54e14144e2b43d5d0f3fc71d6d4df92d46f219575b4aef54938b68\",\"file_bytes\":1483,\"body_bytes\":310}]"
carrier_sha256: 86c4c6c84d7eacc58a45dfa3fa14a66df3558c1fa3c35de26c3dce775724cc75
carrier_bytes: 3130
revision: 1
status: active
---
<!-- vpmodule:atom:begin say-what-breaks-first-not-the-theoretical-limit -->
---
instruction_id: say-what-breaks-first-not-the-theoretical-limit
title: "Say what breaks first, not the theoretical limit"
summary: "A scaling statement names the first bottleneck and the next one, not the theoretical maximum."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A scaling section is written.
conditions_does_not_apply_when: The scale of the product is already known and fixed.
artifact_contract_output_type: scaling-statement
artifact_contract_required_data:
  - the first bottleneck and how it breaks
  - the next bottleneck
artifact_contract_verified_by: the statement names what breaks first and leaves out the theoretical limit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/ARCHITECTURE.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Say what breaks first, not the theoretical limit
Be realistic — most projects don't need to scale to millions
Focus on "what breaks first" not theoretical limits
1. **First bottleneck:** [what breaks first, how to fix]
2. **Second bottleneck:** [what breaks next, how to fix]
<!-- vpmodule:atom:end say-what-breaks-first-not-the-theoretical-limit -->
<!-- vpmodule:atom:begin write-an-anti-pattern-with-what-to-do-instead -->
---
instruction_id: write-an-anti-pattern-with-what-to-do-instead
title: Write an anti-pattern with what to do instead
summary: "An anti-pattern names the mistake, why it is wrong and the correct approach."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: An anti-pattern or a technology to avoid is written down.
conditions_does_not_apply_when: No anti-pattern was found.
artifact_contract_output_type: anti-pattern-entry
artifact_contract_required_data:
  - the mistake
  - the reason it is wrong
  - the correct approach
artifact_contract_verified_by: "each entry names the mistake, the reason and what to do instead"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/ARCHITECTURE.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/research-project/STACK.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Write an anti-pattern with what to do instead
**What people do:** [the mistake]
**Why it's wrong:** [the problem it causes]
**Do this instead:** [the correct approach]
Actively warn against outdated or problematic choices
Explain the specific problem, not just "it's old"
Provide the recommended alternative
<!-- vpmodule:atom:end write-an-anti-pattern-with-what-to-do-instead -->