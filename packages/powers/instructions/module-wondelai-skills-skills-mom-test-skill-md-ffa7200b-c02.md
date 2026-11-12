---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-mom-test-skill-md-ffa7200b-c02"
title: "wondelai-skills: skills/mom-test/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/mom-test/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/mom-test/SKILL.md\"}"
atom_ids:
  - mom-test-talk-about-them
  - mom-test-three-rules
atom_count: 2
atoms: "[{\"atom_id\":\"mom-test-talk-about-them\",\"file_sha256\":\"e56196623341204fc3e51be2a48f750d735146abbee1f4abebace2a959b3ebe8\",\"content_sha256\":\"0d03a5c5e976def629e7f4d0b42ebbbae3c1dec7044f9ce0582d728c6fc9bad4\",\"file_bytes\":1506,\"body_bytes\":409},{\"atom_id\":\"mom-test-three-rules\",\"file_sha256\":\"be8f7bc863f538981b863a89d50737b7fc474243cb1925e5b4182e414b39a535\",\"content_sha256\":\"6c91bd9bb162366e082ca933dbdf7a9c1fe02b1d0f8017b9d32978ea503e7d7e\",\"file_bytes\":1253,\"body_bytes\":204}]"
carrier_sha256: f822699250978e6f6258bc44869065816eb0c76012e8667edfcbd3bea6b48940
carrier_bytes: 2962
revision: 1
status: active
---
<!-- vpmodule:atom:begin mom-test-talk-about-them -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-talk-about-them
title: "Talk about their life, not your idea"
summary: "Ask about past problems and behavior, avoid pitching, and talk less than the customer."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Running a customer conversation for product learning.
conditions_does_not_apply_when: A sales call or a demo whose purpose is to close a deal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The conversation covers the customer's past behavior and the customer does most of the talking."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L14-L17"
status: active
revision: 1
---

# Talk about their life, not your idea

Good customer conversations are about their life, not your idea. The moment you mention what you're building, people switch from sharing truth to performing politeness. Talk about their problems, their lives, and their existing behavior instead of pitching, and ask about specifics in the past, not hypotheticals about the future. Above all, talk less and listen more.
<!-- vpmodule:atom:end mom-test-talk-about-them -->
<!-- vpmodule:atom:begin mom-test-three-rules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: mom-test-three-rules
title: Apply the three Mom Test rules
summary: Use the rules that prevent false validation and shift the conversation from opinions to facts.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Preparing or reviewing a customer interview.
conditions_does_not_apply_when: A conversation that is explicitly a pitch.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interview follows the three rules and produces facts rather than opinions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/mom-test/SKILL.md; sha256=fbf036f31e5932e68adc6d26abe8d75f2213b3c50ea345f7dffa2f235b0ce0ae; locator=skills/mom-test/SKILL.md#L29-L56"
status: active
revision: 1
---

# Apply the three Mom Test rules

Three rules that make it impossible for even your most supportive loved ones to give you false validation, shifting conversations from opinion-gathering to fact-finding.
<!-- vpmodule:atom:end mom-test-three-rules -->