---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-inspired-product-skill-md-47b0994c-c02"
title: "wondelai-skills: skills/inspired-product/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/inspired-product/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/inspired-product/SKILL.md\"}"
atom_ids:
  - inspired-test-four-risks
  - inspired-vision-and-strategy
atom_count: 2
atoms: "[{\"atom_id\":\"inspired-test-four-risks\",\"file_sha256\":\"761322200c888006ea929c34529b3695d5d2d5ab39b63eb2738ba380b94d07da\",\"content_sha256\":\"fe6a4f1bcaaa6ee64f24cc2d4a0acbd5a2b54339fd0d0deff5a3e35d1be1a459\",\"file_bytes\":1369,\"body_bytes\":218},{\"atom_id\":\"inspired-vision-and-strategy\",\"file_sha256\":\"ec2449854210001a6b1b8d02a96bea026e6aa120260917067f9b49ea3e7212b5\",\"content_sha256\":\"0a073662a727f294841c93e1304072c48335be7a42f877d5ac26ff8d2567aa40\",\"file_bytes\":1444,\"body_bytes\":271}]"
carrier_sha256: e0c8b8d7284826f38a7468642b397f6d0d4dadabb109d819b74120ba950c1b7b
carrier_bytes: 3032
revision: 1
status: active
---
<!-- vpmodule:atom:begin inspired-test-four-risks -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-test-four-risks
title: Test ideas against the four product risks
summary: "Use opportunity assessment, interviews, prototyping and user testing to produce cheap evidence against value, usability, feasibility and business risks."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Evaluating a product idea before building it.
conditions_does_not_apply_when: An idea whose risks are already resolved by direct evidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each of the four risks is tested with cheap evidence before engineering investment.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L75-L98"
status: active
revision: 1
---

# Test ideas against the four product risks

Systematically test ideas against the four risks using opportunity assessment, customer interviews, prototyping, and user testing -- producing evidence quickly and cheaply.
<!-- vpmodule:atom:end inspired-test-four-risks -->
<!-- vpmodule:atom:begin inspired-vision-and-strategy -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-vision-and-strategy
title: Give teams a vision and strategy
summary: "State the future being built and sequence the target markets, problems and solutions that realize it."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - working-backwards
conditions_applies_when: Setting product direction or enabling autonomous team decisions.
conditions_does_not_apply_when: A team with a single fixed deliverable and no product direction decision.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - vision
  - strategy
artifact_contract_verified_by: "The vision describes the future and the strategy sequences the markets, problems and solutions."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L124-L148"
status: active
revision: 1
---

# Give teams a vision and strategy

Vision describes the future you're building toward (2-5 years out); strategy sequences the target markets, problems, and solutions that will realize it. Together they give empowered teams the context to make good autonomous decisions.
<!-- vpmodule:atom:end inspired-vision-and-strategy -->