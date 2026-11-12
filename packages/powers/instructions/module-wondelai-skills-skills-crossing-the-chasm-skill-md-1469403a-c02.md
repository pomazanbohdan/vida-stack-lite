---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-crossing-the-chasm-skill-md-1469403a-c02"
title: "wondelai-skills: skills/crossing-the-chasm/SKILL.md module"
summary: "Carrier for 5 atomic instructions from wondelai-skills:skills/crossing-the-chasm/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/crossing-the-chasm/SKILL.md\"}"
atom_ids:
  - crossing-the-chasm-score
  - crossing-the-chasm-select-beachhead
  - crossing-the-chasm-strategic-gap
  - crossing-the-chasm-tornado
  - crossing-the-chasm-whole-product
atom_count: 5
atoms: "[{\"atom_id\":\"crossing-the-chasm-score\",\"file_sha256\":\"74c198b4b8d71d70392b3cc601a31033aa3a168cca12bfa01b1fde931cb171e5\",\"content_sha256\":\"a4039d18525790f2be69766f5f72f5a4e3f442236072212dcdb750de0d9ead69\",\"file_bytes\":1511,\"body_bytes\":383},{\"atom_id\":\"crossing-the-chasm-select-beachhead\",\"file_sha256\":\"4dd485da246a49f4f0c31613ee9e72b8b92c8d7327bea76a6b76c47838e53a6c\",\"content_sha256\":\"13cb0a697fe681bcee576ca5ddfc874ffacacd358fea493be32b61bd4954046a\",\"file_bytes\":1609,\"body_bytes\":450},{\"atom_id\":\"crossing-the-chasm-strategic-gap\",\"file_sha256\":\"efacf04397832613195c0037788c7a613bab038a63e0efab99d5c4dc4d48eb01\",\"content_sha256\":\"3a1c3b3b6867122d0aa6cf734483189fb18826dab2ac28c13ed12b377eed7d33\",\"file_bytes\":1425,\"body_bytes\":278},{\"atom_id\":\"crossing-the-chasm-tornado\",\"file_sha256\":\"54f962fdc72b0c6895045e31726461d2ed10968d321512ee59563b48d6909020\",\"content_sha256\":\"c1ad6c30f0b6dd4b0595c9ffe05cdef8cdf9b189615c392bd59d8047af95ae0f\",\"file_bytes\":1368,\"body_bytes\":278},{\"atom_id\":\"crossing-the-chasm-whole-product\",\"file_sha256\":\"ff1173f8e8f0504cf6d0aac115e9324d6b581ffd7e17cc6f38a769b401d774ad\",\"content_sha256\":\"48c0c01118751096075204f797544460228dfcec4d110fe0b71205e2c9c7ecc8\",\"file_bytes\":1485,\"body_bytes\":411}]"
carrier_sha256: fa78150cf0b9db30765c3b19b03708fdce08f042c727a8093d797c066d022cfe
carrier_bytes: 7985
revision: 1
status: active
---
<!-- vpmodule:atom:begin crossing-the-chasm-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-score
title: Score the go-to-market against the chasm diagnostic
summary: "Count satisfied diagnostic rows, map to 0-10, and report the score, failing rows and a fix for each."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a technology go-to-market.
conditions_does_not_apply_when: A narrow sales review that does not assess the chasm.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: "The report states the score, failing rows and a fix for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L20-L29"
status: active
revision: 1
---

# Score the go-to-market against the chasm diagnostic

Score a tech go-to-market by counting yes answers across the seven Quick Diagnostic rows and mapping them to 0–10 at roughly 1.4 points per satisfied row. Report the score, failing rows, and a fix for each. The stated bands describe 9–10 as crossed, 5–6 as mid-chasm, and ≤3 as early-market tactics aimed at mainstream.
<!-- vpmodule:atom:end crossing-the-chasm-score -->
<!-- vpmodule:atom:begin crossing-the-chasm-select-beachhead -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-select-beachhead
title: "Select a narrow, dominable beachhead"
summary: "Choose a segment with urgent expensive pain, accessible channels, a compelling reason to buy, whole-product potential and vocal references."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Selecting a beachhead segment.
conditions_does_not_apply_when: A segment too large to dominate or too small to matter.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - segments
  - scores
  - choice
artifact_contract_verified_by: The chosen segment meets the criteria and the plan commits to it.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L70-L89"
status: active
revision: 1
---

# Select a narrow, dominable beachhead

Choose a single, narrowly defined beachhead with urgent, expensive pain, known access channels, a compelling reason to buy, whole-product potential through partners, and vocal references. It must be large enough to matter but small enough to dominate, accessible, and not entrenched. Brainstorm 20+ segments, score them against the criteria, choose one, resist keeping options open, and commit to dominate it.
<!-- vpmodule:atom:end crossing-the-chasm-select-beachhead -->
<!-- vpmodule:atom:begin crossing-the-chasm-strategic-gap -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-strategic-gap
title: Treat the chasm as a strategy change
summary: "Recognize that early adopters and mainstream buyers want different things, and change strategy and the whole product to cross."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Moving a technology product from early adopters to the mainstream.
conditions_does_not_apply_when: A product already serving a stable mainstream market.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The strategy and whole product are adapted to mainstream buying criteria.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L14-L19"
status: active
revision: 1
---

# Treat the chasm as a strategy change

Treat the gap between early adopters and mainstream buyers as a strategic chasm: the groups want different things, so change strategy and the whole product to cross it. For modern PLG/freemium B2B SaaS, read the B2B SaaS remapping first.
<!-- vpmodule:atom:end crossing-the-chasm-strategic-gap -->
<!-- vpmodule:atom:begin crossing-the-chasm-tornado -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-tornado
title: Adapt to the post-chasm tornado
summary: "Expect accelerating demand and a shift from solution selling to product selling, standardization and distribution."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Operating after mainstream adoption accelerates.
conditions_does_not_apply_when: A market still before the chasm.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The operating model shifts toward standardization, scale and distribution."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L172-L179"
status: active
revision: 1
---

# Adapt to the post-chasm tornado

After crossing, expect accelerating mainstream demand and a shift from solution selling to product selling and from customization/high touch to standardization, scale and distribution. Seek market leadership in the beachhead before expanding.
<!-- vpmodule:atom:end crossing-the-chasm-tornado -->
<!-- vpmodule:atom:begin crossing-the-chasm-whole-product -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: crossing-the-chasm-whole-product
title: Assemble the whole product
summary: "Build generic, expected, augmented and potential layers, fill gaps through partners, and go to market jointly."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Preparing a mainstream offer.
conditions_does_not_apply_when: A component sale that needs no surrounding product.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The augmented product is complete enough for a pragmatist buyer.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/crossing-the-chasm/SKILL.md; sha256=93c266a4aaa2f95b0682e66ce4450d1eb2bbf64a271942f9cec9ecb59b8fde7c; locator=skills/crossing-the-chasm/SKILL.md#L90-L118"
status: active
revision: 1
---

# Assemble the whole product

Build the whole product for the beachhead across generic, expected, augmented, and potential layers; early-majority buyers require the augmented product. Check the core technology, complements, setup, training/support/documentation/best practices, industry adaptations, and risk mitigation. Identify generic-to-augmented gaps, fill them through partners, and go to market jointly.
<!-- vpmodule:atom:end crossing-the-chasm-whole-product -->