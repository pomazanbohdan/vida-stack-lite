---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-made-to-stick-skill-md-9dd0aa84-c02"
title: "wondelai-skills: skills/made-to-stick/SKILL.md module"
summary: "Carrier for 7 atomic instructions from wondelai-skills:skills/made-to-stick/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/made-to-stick/SKILL.md\"}"
atom_ids:
  - made-to-stick-onboarding
  - made-to-stick-score
  - made-to-stick-simple
  - made-to-stick-stories
  - made-to-stick-succes
  - made-to-stick-toolkit
  - made-to-stick-unexpected
atom_count: 7
atoms: "[{\"atom_id\":\"made-to-stick-onboarding\",\"file_sha256\":\"1976a6db0ecbf08c230355c62535e580481c05f64471bc712d76c64394ee211f\",\"content_sha256\":\"94895e43d66b2c29fb6c4848e25968a813606297af1efde7fda81939ad43e187\",\"file_bytes\":1281,\"body_bytes\":196},{\"atom_id\":\"made-to-stick-score\",\"file_sha256\":\"e80a96aa19316d5ce6d02df56d6c43a10a9a1d09ff6d466465078ea22824ee73\",\"content_sha256\":\"1cf7874edc78e4ce2ed009e924a360bcbe57196cff5ccd6099b5a21cc488cc5f\",\"file_bytes\":1484,\"body_bytes\":337},{\"atom_id\":\"made-to-stick-simple\",\"file_sha256\":\"7c8aeb4a54e4fd7683c024a7b23e5f68f38fffbb775895be4bea98d1302337ee\",\"content_sha256\":\"45dfbb7a1799306f21fd0d261579b686f5dff10fd6f13b43a7d7c14034f66f98\",\"file_bytes\":1338,\"body_bytes\":239},{\"atom_id\":\"made-to-stick-stories\",\"file_sha256\":\"8437cf30cea246d0e1a93d5fd842bb530e7c6fea719c985dc1bf2b719a4c064e\",\"content_sha256\":\"1f0da609f3495797052dd32ccc08e93ee525e4ff95f0b6a9f3119d7c7d3afb1f\",\"file_bytes\":1357,\"body_bytes\":239},{\"atom_id\":\"made-to-stick-succes\",\"file_sha256\":\"182eb8cff6d5112fa74da10af5d73d6aa9dd8c16a9f450991e7a093e02e6162d\",\"content_sha256\":\"9522b000cd24c9ba22f50d078090cf0783d63f7499812be4c750cf98fc5fc62f\",\"file_bytes\":1288,\"body_bytes\":183},{\"atom_id\":\"made-to-stick-toolkit\",\"file_sha256\":\"261e061857fb27970fcb02bc517a8ecb24fce6615743f50907f68df14d464c1d\",\"content_sha256\":\"ca70d158e00a44e9579d59b53543d76a1f55b0bae02b2f1e9b7c66651ef2a945\",\"file_bytes\":1245,\"body_bytes\":206},{\"atom_id\":\"made-to-stick-unexpected\",\"file_sha256\":\"9c1fdf85d66ddba1d528d79eaa82431607fab226bd8057b32bde6b30ac9683d2\",\"content_sha256\":\"1c6a6894c547fb78fdab60b631dea5c2d451439dd397e028faed35b9cacd98ab\",\"file_bytes\":1283,\"body_bytes\":198}]"
carrier_sha256: 42fb47fd99c0abf74b9e999964fde70ecef088b204a2517056fd65c8f56e6906
carrier_bytes: 9979
revision: 1
status: active
---
<!-- vpmodule:atom:begin made-to-stick-onboarding -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-onboarding
title: Design sticky onboarding
summary: "Present one action per screen, provide an early quick win, show real results, use truthful social proof and celebrate the first success."
capability_tags:
  - design-user-interface
pattern_tags:
  - message-stickiness
conditions_applies_when: Designing a product onboarding flow.
conditions_does_not_apply_when: An API-only integration with no user onboarding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each screen has one action and the user reaches a real quick win early.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L205-L213"
status: active
revision: 1
---

# Design sticky onboarding

For onboarding, present one action per screen, provide an early quick win, show real results, use truthful social proof, and celebrate first success with a user story.
<!-- vpmodule:atom:end made-to-stick-onboarding -->
<!-- vpmodule:atom:begin made-to-stick-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-score
title: Score the message against the six traits
summary: "Rate each of the six traits 1-10, map the 6-60 total to a band, and report the score, lowest traits and fixes."
capability_tags:
  - write-technical-prose
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a message for stickiness.
conditions_does_not_apply_when: A narrow grammar review that does not assess memorability.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - lowest-traits
  - improvement-list
artifact_contract_verified_by: "The report states the 6-60 score, its band, the lowest traits and the specific fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L18-L20"
status: active
revision: 1
---

# Score the message

Rate each of the six traits from 1 to 10, sum them to a 6–60 total, and map the total to a band: 50–60 = 9–10, extremely sticky; 35–49 = 7–8, strong; 20–34 = 4–6, forgettable; below 20 = ≤3, will not stick. State the current score, the lowest-scoring traits and the specific fix from the diagnostic.
<!-- vpmodule:atom:end made-to-stick-score -->
<!-- vpmodule:atom:begin made-to-stick-simple -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-simple
title: Find and lead with the core idea
summary: "Communicate one essential message compactly, lead with it, and test whether a smart 12-year-old can understand it."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Writing a core message or summary.
conditions_does_not_apply_when: A document where exhaustive coverage is the goal.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - core-message
artifact_contract_verified_by: "The core message is singular, compact and understandable without becoming meaningless."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L28-L53"
status: active
revision: 1
---

# Find and lead with the core idea

Identify the core idea and communicate it compactly; prioritize one essential message, lead with it, and test whether a smart 12-year-old can understand it without reducing it to meaningless simplicity.
<!-- vpmodule:atom:end made-to-stick-simple -->
<!-- vpmodule:atom:begin made-to-stick-stories -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-stories
title: Use stories to simulate and inspire
summary: "Structure product stories with a relatable character, emotional problem, concrete journey, specific solution and measurable plus emotional outcome."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Telling a product or customer story.
conditions_does_not_apply_when: A terse status update with no narrative.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - customer-story
artifact_contract_verified_by: "The story includes a character, problem, journey, solution and outcome."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L160-L180"
status: active
revision: 1
---

# Use stories to simulate and inspire

Use stories to simulate experience and inspire action; structure product stories as relatable character, emotional problem, concrete journey, specific solution, and measurable plus emotional outcome.
<!-- vpmodule:atom:end made-to-stick-stories -->
<!-- vpmodule:atom:begin made-to-stick-succes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-succes
title: Make ideas stick with SUCCESs
summary: "Counter the Curse of Knowledge with simple, unexpected, concrete, credible, emotional and story-driven communication."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Writing or reviewing a message that must be remembered and acted on.
conditions_does_not_apply_when: A reference document whose only purpose is exhaustive detail.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The message applies the six traits where they serve the core idea.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L14-L17"
status: active
revision: 1
---

# Make ideas stick with SUCCESs

Treat the Curse of Knowledge as a barrier to communication and use the SUCCESs framework's six principles to make ideas more memorable and impactful.
<!-- vpmodule:atom:end made-to-stick-succes -->
<!-- vpmodule:atom:begin made-to-stick-toolkit -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-toolkit
title: "Use SUCCESs as a toolkit, not a checklist"
summary: Apply the traits that serve the idea and do not force all six onto a message that needs fewer.
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Choosing which stickiness traits to use.
conditions_does_not_apply_when: A message that must satisfy a fixed template.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The chosen traits serve the core idea without padding.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L22-L27"
status: active
revision: 1
---

# Use SUCCESs as a toolkit, not a checklist

Use SUCCESs as a toolkit rather than a checklist: sticky ideas need not use all six traits, and the traits should not be forced onto a message that needs fewer.
<!-- vpmodule:atom:end made-to-stick-toolkit -->
<!-- vpmodule:atom:begin made-to-stick-unexpected -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: made-to-stick-unexpected
title: Break patterns and open curiosity gaps
summary: "Gain attention by breaking patterns, sustain it with curiosity gaps, and connect surprise to the core message."
capability_tags:
  - write-technical-prose
pattern_tags:
  - message-stickiness
conditions_applies_when: Opening a message or presentation.
conditions_does_not_apply_when: A routine update where surprise would distract.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The surprise or curiosity gap supports the core message rather than distracting from it.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/made-to-stick/SKILL.md; sha256=6eb330f403882d8f944590772170de48847f7025b942ee56f564717229d3965e; locator=skills/made-to-stick/SKILL.md#L54-L78"
status: active
revision: 1
---

# Break patterns and open curiosity gaps

Gain attention by breaking patterns and sustain it with curiosity gaps; connect surprise to the core message and avoid gimmicky surprise without substance.
<!-- vpmodule:atom:end made-to-stick-unexpected -->