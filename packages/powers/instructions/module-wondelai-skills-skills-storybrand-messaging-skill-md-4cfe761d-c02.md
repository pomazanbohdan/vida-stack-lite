---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-storybrand-messaging-skill-md-4cfe761d-c02"
title: "wondelai-skills: skills/storybrand-messaging/SKILL.md module"
summary: "Carrier for 6 atomic instructions from wondelai-skills:skills/storybrand-messaging/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/storybrand-messaging/SKILL.md\"}"
atom_ids:
  - storybrand-plan
  - storybrand-problem-and-villain
  - storybrand-sb7
  - storybrand-score
  - storybrand-success-picture
  - storybrand-tone
atom_count: 6
atoms: "[{\"atom_id\":\"storybrand-plan\",\"file_sha256\":\"6d7ca446cf6dca296143807aea371976a9b0582e6a44c4e9f69cbb6e22ca6bcf\",\"content_sha256\":\"adc5cf6234cd8846c1b262b19283d7ca7b3a500bccf40be1ef659f1a67e54a2e\",\"file_bytes\":1216,\"body_bytes\":168},{\"atom_id\":\"storybrand-problem-and-villain\",\"file_sha256\":\"eca3d9614ef2dbf41987a37cbd960aadc8cfc8a53007239e138b24b07d1dfe2e\",\"content_sha256\":\"88b2fe4e5cb533cb09165f8719fb4669aa7f30efe816d23bbb4c59773c6ec053\",\"file_bytes\":1252,\"body_bytes\":178},{\"atom_id\":\"storybrand-sb7\",\"file_sha256\":\"3e04a9c35c32b240d50267e53584a3030ba397765e39faa552f42f16e2b7cdb5\",\"content_sha256\":\"1a80e0758adbbaaa38be5ec2b1d506a126ab3fd9419b628f0974d7cc47d82b27\",\"file_bytes\":1158,\"body_bytes\":88},{\"atom_id\":\"storybrand-score\",\"file_sha256\":\"e62a0da292b2fbed70850c872cc720d2190f5112b26941a2bae93e7a0633735e\",\"content_sha256\":\"25170bb9a8948709498c8d495e2ae7f2551b704552fcc2e72066b9b78839d5ca\",\"file_bytes\":1817,\"body_bytes\":646},{\"atom_id\":\"storybrand-success-picture\",\"file_sha256\":\"b77bfa0f03690bd1f0e91e69ca76e08bdb70ddcb08f18121f361d692f6752179\",\"content_sha256\":\"9d3a45499007cc1facd3842cffa05ad5ad56510926b439ba600b78246b1c9f59\",\"file_bytes\":1288,\"body_bytes\":204},{\"atom_id\":\"storybrand-tone\",\"file_sha256\":\"f603344cace420feb23690e487809db45b8bb829bfe1cb289770ceec72073837\",\"content_sha256\":\"12d94cb711158b65664660609ca6939d1dbdd48ce5b76b79e09d2d76aabe535e\",\"file_bytes\":1348,\"body_bytes\":228}]"
carrier_sha256: b4db28c4a6588cce46a37f602bb117625fc9252c9ba6e1d0cfb75ab92d145fd5
carrier_bytes: 8658
revision: 1
status: active
---
<!-- vpmodule:atom:begin storybrand-plan -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-plan
title: Give a simple process and agreement plan
summary: Provide a process of at most four steps and an agreement plan whose commitments reduce risk.
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the plan section of a message.
conditions_does_not_apply_when: A one-step offer with no process to explain.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan has at most four steps and risk-reducing commitments.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L102-L125"
status: active
revision: 1
---

# Give a simple process and agreement plan

Provide a Process Plan of at most four steps (typically three to four) and an Agreement Plan whose commitments reduce risk.
<!-- vpmodule:atom:end storybrand-plan -->
<!-- vpmodule:atom:begin storybrand-problem-and-villain -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-problem-and-villain
title: Define the problem and a relatable villain
summary: "State the external, internal and philosophical problem, personified by a specific villain."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the problem section of a message.
conditions_does_not_apply_when: A message with no identifiable customer problem.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The message names all three problem levels and a concrete villain.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L53-L76"
status: active
revision: 1
---

# Define the problem and a relatable villain

Define the customer's problem at external, internal, and philosophical levels, and personify it with a specific, relatable villain.
<!-- vpmodule:atom:end storybrand-problem-and-villain -->
<!-- vpmodule:atom:begin storybrand-sb7 -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-sb7
title: Use the seven-part story pattern
summary: "Structure messaging with a character, problem, guide, plan, call to action, failure stakes and success outcome."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Drafting a marketing message or page.
conditions_does_not_apply_when: A short transactional notice with no narrative.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - sb7-outline
artifact_contract_verified_by: The message contains all seven story elements in order.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L22-L25"
status: active
revision: 1
---

# Use the seven-part story pattern

Use the seven-part SB7 story pattern for messaging.
<!-- vpmodule:atom:end storybrand-sb7 -->
<!-- vpmodule:atom:begin storybrand-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-score
title: Score the messaging
summary: "Score marketing copy by the seven diagnostic rows plus up to three points for a one-liner; report the score band, failed rows and changes to reach 10/10."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing marketing copy.
conditions_does_not_apply_when: A narrow visual review that does not assess messaging.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - improvement-list
artifact_contract_verified_by: "The report states the score band, the failed diagnostic rows and the changes needed for 10/10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L18-L20"
status: active
revision: 1
---

# Score the marketing copy

Score by the Quick Diagnostic: 1 point per satisfied row (7 rows) plus up to 3 points for a one-liner that passes the cocktail-party test (clear and repeatable after one hearing). Bands: 9–10 = customer is the hero, all three problem levels are named, empathy and authority are both shown, a three-step plan, one obvious Direct CTA, and both success and failure stakes are painted; 5–6 = SB7 is partly applied but the internal problem, stakes or CTA is missing; ≤3 = brand-as-hero, feature-led, or no clear ask. State the current score, the failed diagnostic rows and the specific changes needed to reach 10/10.
<!-- vpmodule:atom:end storybrand-score -->
<!-- vpmodule:atom:begin storybrand-success-picture -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-success-picture
title: Paint a tangible success picture
summary: "Show a vivid post-engagement outcome in terms of status, completeness or self-realization."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the success section of a message.
conditions_does_not_apply_when: A message that cannot describe a customer outcome.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The success picture is specific and transformation-focused rather than a feature list.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L178-L201"
status: active
revision: 1
---

# Paint a tangible success picture

Show a tangible, vivid post-engagement success picture in terms of status, completeness, or self-realization, using specific transformation rather than vague features.
<!-- vpmodule:atom:end storybrand-success-picture -->
<!-- vpmodule:atom:begin storybrand-tone -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-tone
title: Keep a consistent brand voice
summary: "Convey empathy, authority, confidence and helpfulness across channels, avoiding hero language, jargon, condescension and tentative weakness."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing or reviewing brand copy across channels.
conditions_does_not_apply_when: A legal or regulatory notice with mandated language.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The voice is consistent and avoids hero language, jargon and condescension."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L216-L226"
status: active
revision: 1
---

# Keep a consistent brand voice

Keep brand voice consistent across channels while adapting to context; convey empathy, authority, confidence, and helpfulness; avoid hero language, jargon, condescension, and tentative weakness.
<!-- vpmodule:atom:end storybrand-tone -->