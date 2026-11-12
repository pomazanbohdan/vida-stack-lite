---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-improve-retention-skill-md-cd90ad6b-c03"
title: "wondelai-skills: skills/improve-retention/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/improve-retention/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/improve-retention/SKILL.md\"}"
atom_ids:
  - improve-retention-score
  - improve-retention-start-tiny
  - improve-retention-starter-step
  - improve-retention-tiny-habits
atom_count: 4
atoms: "[{\"atom_id\":\"improve-retention-score\",\"file_sha256\":\"c8b87846663745850a8a8c22322fe9a697dda951596b31732767efdfd768cfae\",\"content_sha256\":\"9d6ef6c923aa1bba84936aaa6460217c034852541047e29fb4bfc0adb0be0787\",\"file_bytes\":1725,\"body_bytes\":556},{\"atom_id\":\"improve-retention-start-tiny\",\"file_sha256\":\"acc4c071f1a223d3da639b0642fa1d1cb84ba2e857b719cfb41036c1c3cb14c2\",\"content_sha256\":\"4b299212c958d8fe3dfd4cfecb08a9613e0edb74b54a69ecf6624acc945da21d\",\"file_bytes\":1170,\"body_bytes\":139},{\"atom_id\":\"improve-retention-starter-step\",\"file_sha256\":\"d3c7588a3b5015eb4abe7c50db87a2435daae110f34a1732f7169a0ef5ba0529\",\"content_sha256\":\"30b2b8aff3346d8dcece73f22dc4074c210efbc46c49bbf91b1353061840565d\",\"file_bytes\":1283,\"body_bytes\":193},{\"atom_id\":\"improve-retention-tiny-habits\",\"file_sha256\":\"55b966ebc9de7cc550703cb7c2c02e9a621b1fb42861d9679ed757e5aabf81da\",\"content_sha256\":\"35eca79164541a3b51757788c8ee85b2c2c0e967a6ce43539a024e433b6e09de\",\"file_bytes\":1271,\"body_bytes\":178}]"
carrier_sha256: 09205d76c9a2ecf2cb5a40f2c51858673e270559539d3b5e456e49ee1d2f1f16
carrier_bytes: 5900
revision: 1
status: active
---
<!-- vpmodule:atom:begin improve-retention-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-score
title: Score the retention design
summary: "Score the six Quick Diagnostic rows pass/fail, start at 10, subtract 2 for each failure in rows 1-2 and 1.5 for rows 3-6, and report the score, failing rows and stated band."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a retention design against the six-row rubric.
conditions_does_not_apply_when: A code review that does not assess the behavior design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the band interpretation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L37-L40"
status: active
revision: 1
---

# Score the retention design

Target 10/10. Score six Quick Diagnostic rows pass/fail, start at 10, subtract 2 per failing low-Motivation or below-Action-Line row (1–2), and 1.5 per failing prompt, celebration, bottleneck, or scaling row (3–6). All-pass is 10 and all-fail is 0. State score and failing rows. Bands: 9–10 means reliable crossing at low Motivation, event/anchor prompts and celebration; 5–6 means motivation-spike dependence or non-bottleneck optimization; <=3 means core action below the Action Line, spam prompts, no habit wiring.
<!-- vpmodule:atom:end improve-retention-score -->
<!-- vpmodule:atom:begin improve-retention-start-tiny -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-start-tiny
title: Start with the best-matched tiny behavior
summary: "Shrink the best-matched behavior to its Starter Step, design its prompt and add celebration."
capability_tags:
  - design-behavior-change
pattern_tags:
  - starter-step
conditions_applies_when: Starting the chosen behavior.
conditions_does_not_apply_when: A behavior that has not been matched.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The Starter Step, prompt and celebration are defined."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L173-L175"
status: active
revision: 1
---

# Start with the best-matched tiny behavior

Shrink the best-matched behavior to its Starter Step, design its prompt, and add celebration.
<!-- vpmodule:atom:end improve-retention-start-tiny -->
<!-- vpmodule:atom:begin improve-retention-starter-step -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-starter-step
title: Choose a Starter Step
summary: "For every target behavior identify the tiniest meaningful Starter Step, such as filling one field, opening the dashboard or sending one comment."
capability_tags:
  - design-behavior-change
pattern_tags:
  - starter-step
conditions_applies_when: Shrinking a target behavior for first use.
conditions_does_not_apply_when: A behavior already small enough to complete.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The Starter Step is named as the tiniest meaningful version.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L144-L153"
status: active
revision: 1
---

# Choose a Starter Step

For every target behavior identify the tiniest meaningful Starter Step; examples include filling one onboarding field, opening analytics, and sending one team comment.
<!-- vpmodule:atom:end improve-retention-starter-step -->
<!-- vpmodule:atom:begin improve-retention-tiny-habits -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-tiny-habits
title: Apply the Tiny Habits method
summary: "Make behaviors small enough to need almost no motivation, anchor them to an existing routine and celebrate immediately."
capability_tags:
  - design-behavior-change
pattern_tags:
  - tiny-habit-recipe
conditions_applies_when: Turning a target behavior into a habit.
conditions_does_not_apply_when: A one-off action with no repetition goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The habit names a tiny behavior, an existing anchor and an immediate celebration."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L130-L133"
status: active
revision: 1
---

# Apply the Tiny Habits method

Apply Tiny Habits by making behavior small enough to need almost no Motivation, anchoring it to an existing routine, and celebrating immediately.
<!-- vpmodule:atom:end improve-retention-tiny-habits -->