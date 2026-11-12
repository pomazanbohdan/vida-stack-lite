---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-influence-psychology-skill-md-a91fb3d6-c02"
title: "wondelai-skills: skills/influence-psychology/SKILL.md module"
summary: "Carrier for 5 atomic instructions from wondelai-skills:skills/influence-psychology/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/influence-psychology/SKILL.md\"}"
atom_ids:
  - influence-reciprocity
  - influence-scarcity
  - influence-score
  - influence-social-proof
  - influence-unity
atom_count: 5
atoms: "[{\"atom_id\":\"influence-reciprocity\",\"file_sha256\":\"a66b06ecd525cdc206cf1d9cd3536c8a196c7140f0d077e0488125bfda268731\",\"content_sha256\":\"2e6e868e6bd67684aaa054733e9d0eb7e4b05ce1024d6fbd1e091c3c869f49ca\",\"file_bytes\":1297,\"body_bytes\":215},{\"atom_id\":\"influence-scarcity\",\"file_sha256\":\"28112f624e369d1b1a0d57b49bf5e09666f637fcd5d0463bf76c673189a9b9b2\",\"content_sha256\":\"b580edbe97e51385df1087ccfadbed3527d39a8a08afda2f6435075b8892677e\",\"file_bytes\":1393,\"body_bytes\":294},{\"atom_id\":\"influence-score\",\"file_sha256\":\"050d339b3b88895a16e92fca705a40578d87e10696b0aabfc42fb2378f8b1323\",\"content_sha256\":\"ea00af84bd255af18994678120eea618f5de723838c36cdbbe1cda58c4e76a14\",\"file_bytes\":1789,\"body_bytes\":625},{\"atom_id\":\"influence-social-proof\",\"file_sha256\":\"c9a1d44d990b8306e04fa75b25ce63432a731a26c48f4188fa1373a316dfef72\",\"content_sha256\":\"b4f1b880892a708ab7f990cbf0f076533f2ace50832d66c58469917f11c20477\",\"file_bytes\":1361,\"body_bytes\":260},{\"atom_id\":\"influence-unity\",\"file_sha256\":\"256ad41160611101a43f1a8ba8ee92c17ed33ce21fb6d1e0a3ddae4b8217bded\",\"content_sha256\":\"e79aae6953c51131c3a1303449d4e1feb985f10e3026123bce44940f6fdc34bd\",\"file_bytes\":1267,\"body_bytes\":197}]"
carrier_sha256: ce9c5fa5a467aeaee3ef56772035b90e7c11b29e8be23bcda653fd9740b30dcd
carrier_bytes: 7578
revision: 1
status: active
---
<!-- vpmodule:atom:begin influence-reciprocity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-reciprocity
title: Give before asking
summary: "Use gifts that precede requests, favor unexpected personalized gifts, and recognize that small gifts can create obligation."
capability_tags:
  - design-structure
pattern_tags:
  - persuasion-principle
conditions_applies_when: Using reciprocity in a customer interaction.
conditions_does_not_apply_when: A transactional exchange with no gift or favor.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The gift is genuine, precedes the request and is not a hidden condition."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L29-L54"
status: active
revision: 1
---

# Give before asking

Use reciprocity by giving before asking; gifts should precede requests, and unexpected personalized gifts are more effective than expected generic ones. Small gifts can also create obligation.
<!-- vpmodule:atom:end influence-reciprocity -->
<!-- vpmodule:atom:begin influence-scarcity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-scarcity
title: Use only genuine scarcity
summary: "Use real limits, deadlines or competition, and never invent limits, reset countdowns, repeat false low-stock claims or pressure vulnerable users."
capability_tags:
  - design-structure
pattern_tags:
  - persuasion-principle
conditions_applies_when: Using scarcity or urgency in an offer.
conditions_does_not_apply_when: An offer with no real constraint.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every scarcity signal reflects an actual constraint and is not reset or fabricated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L192-L228"
status: active
revision: 1
---

# Use only genuine scarcity

Use scarcity signals such as finite quantity, genuine deadlines, exclusive access, or real competition; scarcity must reflect actual constraints. Do not invent limits, use resetting countdowns, show a repeatedly false low-stock claim, or pressure vulnerable users.
<!-- vpmodule:atom:end influence-scarcity -->
<!-- vpmodule:atom:begin influence-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-score
title: Score persuasive elements with the ethics gate
summary: "Score the persuasive element against the 9-10/7-8/5-6/≤3 bands, apply the ethics gate and report the change needed."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a persuasive element.
conditions_does_not_apply_when: A non-persuasive interface review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-criteria
  - improvement-list
artifact_contract_verified_by: "The report states the score band, the failed criteria and the change needed; deceptive tactics cap it at 3."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L18-L25"
status: active
revision: 1
---

# Score the persuasive element

Run the Quick Diagnostic, then score against the bands: 9–10 = multiple principles deliberately layered, every claim truthful, users can reverse the decision, passes the transparency test, safe for vulnerable users; 7–8 = principles layered and honest but one gap; 5–6 = one principle present but generic, or leverage left on the table; ≤3 = no principle deliberately designed, or any deceptive/coercive tactic. Fabricated proof, fake scarcity or hidden-cost dark patterns cap the score at 3. State the current score, the failed criteria and the specific change needed to reach 10/10.
<!-- vpmodule:atom:end influence-score -->
<!-- vpmodule:atom:begin influence-social-proof -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-social-proof
title: Use truthful social proof
summary: "Show proof from similar others especially under uncertainty, avoid negative proof, prefer specific numbers and disclose curated proof."
capability_tags:
  - research-primary-sources
pattern_tags:
  - persuasion-principle
conditions_applies_when: "Adding testimonials, reviews or usage evidence."
conditions_does_not_apply_when: A claim with no user evidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The proof is representative or disclosed as curated, specific and truthful."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L85-L123"
status: active
revision: 1
---

# Use truthful social proof

Use social proof especially when people are uncertain and show proof from similar others; avoid negative social proof and prefer specific numbers. Disclose curated or cherry-picked proof instead of presenting it as representative.
<!-- vpmodule:atom:end influence-social-proof -->
<!-- vpmodule:atom:begin influence-unity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: influence-unity
title: Build unity without an enemy
summary: "Define shared place, experience, values or tribe without vilifying an out-group or manufacturing resentment."
capability_tags:
  - design-structure
pattern_tags:
  - persuasion-principle
conditions_applies_when: Building community or shared identity.
conditions_does_not_apply_when: A message that depends on attacking another group.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The shared identity is specific and does not rely on an out-group villain.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/influence-psychology/SKILL.md; sha256=e7cd3142a11a631c56be159374a42341b370efb26cc3adc25a9f5e6627b84994; locator=skills/influence-psychology/SKILL.md#L229-L262"
status: active
revision: 1
---

# Build unity without an enemy

Build unity around shared place, experience, values, or tribe; define the in-group by what it stands for without vilifying an out-group or manufacturing resentment.
<!-- vpmodule:atom:end influence-unity -->