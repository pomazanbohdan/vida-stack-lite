---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-storybrand-messaging-skill-md-4cfe761d-c01"
title: "wondelai-skills: skills/storybrand-messaging/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/storybrand-messaging/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/storybrand-messaging/SKILL.md\"}"
atom_ids:
  - storybrand-calls-to-action
  - storybrand-character-desire
  - storybrand-common-mistakes
  - storybrand-customer-hero
  - storybrand-diagnostic
  - storybrand-failure-stakes
  - storybrand-guide
  - storybrand-one-liner
atom_count: 8
atoms: "[{\"atom_id\":\"storybrand-calls-to-action\",\"file_sha256\":\"ba0ec5e631d863116cfbc686b230f548dcfb74fb1f9b1dcfaabd0f93f4129b0e\",\"content_sha256\":\"b8b3e3b5ad780f04c46d2b0703cfb941040a80122d3f1f99d30d988ba5acbed2\",\"file_bytes\":1436,\"body_bytes\":308},{\"atom_id\":\"storybrand-character-desire\",\"file_sha256\":\"119b8640a61a6f7248d28dcce4a5eabf6f32f0f377928d750e75521dff082734\",\"content_sha256\":\"ae2f4c7324610cf1ed10bc62ff345be05b1b6c9b0cecc672c05820bd2a778f09\",\"file_bytes\":1216,\"body_bytes\":148},{\"atom_id\":\"storybrand-common-mistakes\",\"file_sha256\":\"6c6c271369d9c6bd1b5fb0a1189b42531f44f424374278694ee49a08c5b26c02\",\"content_sha256\":\"3c80fa2d70702a9dd8c82b4c5d33af95fad9a0249bb78ce991d6912329689f0d\",\"file_bytes\":1578,\"body_bytes\":469},{\"atom_id\":\"storybrand-customer-hero\",\"file_sha256\":\"74ee46dfa3c6270fb762008b71c68dd4c76bc2404412d41653123e529888a8d5\",\"content_sha256\":\"a05758bc324ee570fdd34247f75a2a1338aaf708a92a762c5e9b61d1b5285b93\",\"file_bytes\":1175,\"body_bytes\":130},{\"atom_id\":\"storybrand-diagnostic\",\"file_sha256\":\"91e57621967d1fbb79dafe06da93ecb39b76bfaed9a4a5c5475b6f4d02ee85cc\",\"content_sha256\":\"f09598a0fe8540f84e77c913bdacb70a86e924da49937b643ce904e7030a41b9\",\"file_bytes\":1401,\"body_bytes\":256},{\"atom_id\":\"storybrand-failure-stakes\",\"file_sha256\":\"53b0f392234493c1e82d1f0dfcd4b83869df4289d9a523df78322c9404a19811\",\"content_sha256\":\"f9e19c5a25320965a19745927291a66d3d1c28e5ffc3742a1df6795b3d50bb9e\",\"file_bytes\":1239,\"body_bytes\":153},{\"atom_id\":\"storybrand-guide\",\"file_sha256\":\"cc77175ae0968f2e072c1c4a53bcd340b3e9f8266e26c40f80c0293ac923224e\",\"content_sha256\":\"31e62d8f27fe1a0ab3da301b475fe653d5efd81581de42aeb11827640bc60446\",\"file_bytes\":1252,\"body_bytes\":205},{\"atom_id\":\"storybrand-one-liner\",\"file_sha256\":\"fb3a127c149f40803596cf305921be3712c74164fac11b785ecd9f278f49d21c\",\"content_sha256\":\"977f5dc087cacc84a7df2681f2eeef7ce4495ee5b261181392dbdfaa93c25e18\",\"file_bytes\":1347,\"body_bytes\":205}]"
carrier_sha256: 5d6976e6d97faf1a73b2012844f5f39b4a864b703d4ef774f601b627224eeb1b
carrier_bytes: 11477
revision: 1
status: active
---
<!-- vpmodule:atom:begin storybrand-calls-to-action -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-calls-to-action
title: Use direct and transitional calls to action
summary: "Make one direct CTA prominent and repeat it, add a lower-commitment transitional CTA, and never label a paid action as free."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Designing a marketing call to action.
conditions_does_not_apply_when: An informational page with no action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "One direct CTA is prominent, the transitional CTA is lower-commitment, and labels match the outcome."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L126-L153"
status: active
revision: 1
---

# Use direct and transitional calls to action

Use a Direct CTA and a lower-commitment Transitional CTA; make the Direct CTA prominent and repeat it, with one obvious Direct CTA per page and action language. A paid action must never be labeled free or transitional; button text must match the click outcome.
<!-- vpmodule:atom:end storybrand-calls-to-action -->
<!-- vpmodule:atom:begin storybrand-character-desire -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-character-desire
title: Give the hero one specific desire
summary: "Make the customer the hero, define one specific desire per message and tailor it to the segment."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the character section of a message.
conditions_does_not_apply_when: A message that must serve multiple unrelated segments.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The message names one customer desire rather than several.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L26-L52"
status: active
revision: 1
---

# Give the hero one specific desire

Make the customer the hero and define one specific desire per message; tailor messaging to differing segments.
<!-- vpmodule:atom:end storybrand-character-desire -->
<!-- vpmodule:atom:begin storybrand-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-common-mistakes
title: Avoid common messaging mistakes
summary: "Avoid making the brand the hero, multiple messages per asset, cleverness over clarity, feature focus, missing CTA or stakes, and opening with 'We'."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing marketing messaging for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names each mistake and its correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L227-L238"
status: active
revision: 2
---

# Avoid common messaging mistakes

Check each mistake against its correction: being the hero -> position the brand as guide; multiple messages -> one clear message per asset; cleverness over clarity -> choose clarity; feature-focused -> lead with outcomes; no clear CTA -> ask for the sale; no stakes -> paint the failure picture; starting with "We" -> start with the customer's problem. State the correction for each mistake rather than referring to an unlisted list.
<!-- vpmodule:atom:end storybrand-common-mistakes -->
<!-- vpmodule:atom:begin storybrand-customer-hero -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-customer-hero
title: Make the customer the hero
summary: Position the brand as the guide that helps the customer achieve their goal.
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing or reviewing marketing messaging.
conditions_does_not_apply_when: An internal document with no customer audience.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The customer is the subject of the message and the brand supports their goal.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L14-L17"
status: active
revision: 1
---

# Make the customer the hero

The customer is the hero; position the brand as a guide that helps the customer achieve their goal.
<!-- vpmodule:atom:end storybrand-customer-hero -->
<!-- vpmodule:atom:begin storybrand-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-diagnostic
title: Run the messaging diagnostic
summary: "Check clarity, customer-as-hero, internal problem, empathy and authority, a simple plan, one CTA and both success and failure stakes."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of marketing messaging.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and applies the stated action.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L239-L250"
status: active
revision: 2
---

# Run the messaging diagnostic

Use the seven diagnostic questions to check clarity, customer-as-hero, internal problem, empathy and authority, a three-step plan, one CTA, and both success and failure stakes; apply the listed action for each failed check.
<!-- vpmodule:atom:end storybrand-diagnostic -->
<!-- vpmodule:atom:begin storybrand-failure-stakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-failure-stakes
title: Show the cost of inaction
summary: "Show consequences without scare campaigning, focusing on opportunity cost and pairing failure with success."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the failure-stakes section of a message.
conditions_does_not_apply_when: A low-stakes message where failure is irrelevant.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The message states a credible opportunity cost and pairs it with success.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L154-L177"
status: active
revision: 1
---

# Show the cost of inaction

Show consequences of inaction without scare campaigning; focus on opportunity cost and pair failure with success messaging.
<!-- vpmodule:atom:end storybrand-failure-stakes -->
<!-- vpmodule:atom:begin storybrand-guide -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-guide
title: Position the brand as the guide
summary: "Show empathy and authority without making the brand's origin story the centerpiece."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing the guide section of a message.
conditions_does_not_apply_when: A message that is explicitly a founder story.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The brand demonstrates empathy and relevant authority in a supporting role.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L77-L101"
status: active
revision: 1
---

# Position the brand as the guide

Position the brand as a guide that shows both empathy and authority; keep the brand's origin story from becoming the centerpiece, using only brief, relevant credentials.
<!-- vpmodule:atom:end storybrand-guide -->
<!-- vpmodule:atom:begin storybrand-one-liner -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: storybrand-one-liner
title: Write a repeatable one-liner
summary: "Explain the organization in one sentence structured as problem, solution and result, and test whether it can be repeated after one hearing."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-framework
conditions_applies_when: Writing an elevator pitch or one-line explanation.
conditions_does_not_apply_when: A long-form document with no summary requirement.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - one-liner
artifact_contract_verified_by: The one-liner follows problem-solution-result and is repeatable after one hearing.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/storybrand-messaging/SKILL.md; sha256=a11d015c33e6d5e66c68f6d4da98e4bd0fda6ca32efc805ff4882d0ce0ab6e1c; locator=skills/storybrand-messaging/SKILL.md#L202-L215"
status: active
revision: 1
---

# Write a repeatable one-liner

Use a one-sentence explanation of what the organization does, structured as problem plus solution plus result, and test whether someone can repeat it after hearing it once.
<!-- vpmodule:atom:end storybrand-one-liner -->