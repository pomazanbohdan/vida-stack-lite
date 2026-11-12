---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-hooked-ux-skill-md-c2564fb9-c02"
title: "wondelai-skills: skills/hooked-ux/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/hooked-ux/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/hooked-ux/SKILL.md\"}"
atom_ids:
  - hooked-ux-manipulation-matrix
  - hooked-ux-onboarding-action
  - hooked-ux-onboarding-investment
  - hooked-ux-onboarding-loop
  - hooked-ux-onboarding-reward
  - hooked-ux-onboarding-trigger
  - hooked-ux-regulatory
  - hooked-ux-score
atom_count: 8
atoms: "[{\"atom_id\":\"hooked-ux-manipulation-matrix\",\"file_sha256\":\"a2efc6f29204e438c27b072dd0faf07117b4d4dd55e84683d2ac6dc643409ff4\",\"content_sha256\":\"0d07bf9667cbff5f1263e670e7b28c412edee4193be582a781136ce801bc989a\",\"file_bytes\":1520,\"body_bytes\":481},{\"atom_id\":\"hooked-ux-onboarding-action\",\"file_sha256\":\"b1707351687902c93d83ba6ae55a7eb8d7077623b9a2ba5402cc3d0d8f1a96f4\",\"content_sha256\":\"52eed83eb0d770f85d91fa906b79f660de92675ead9279a5cedfe5ff4c95db8a\",\"file_bytes\":1249,\"body_bytes\":198},{\"atom_id\":\"hooked-ux-onboarding-investment\",\"file_sha256\":\"12f2e3b5b7f0c0908daccd24a187445b997c4b3a62e9f01a3e5c2cfedc283e9b\",\"content_sha256\":\"bf6b47b531ee640ed7718ca40b7305190dab0a819a577c6319d51b5d9d509192\",\"file_bytes\":1211,\"body_bytes\":185},{\"atom_id\":\"hooked-ux-onboarding-loop\",\"file_sha256\":\"b80e3e7781a733ea5b5033bc07145a570794a415c169ceb7c7bf2afcaa477fdd\",\"content_sha256\":\"ed91a674784bd7829e970488473f5a33bb2bf3157255f14c29035b166f1525b1\",\"file_bytes\":1246,\"body_bytes\":196},{\"atom_id\":\"hooked-ux-onboarding-reward\",\"file_sha256\":\"21bc83739695f3ee144f1045867cfac7fd9fbd235b6d297a123fd02a4af72648\",\"content_sha256\":\"adef5c4246781dcd2b035bffef92f4210b17ecd94e517ab4dae7d1db23972dab\",\"file_bytes\":1254,\"body_bytes\":201},{\"atom_id\":\"hooked-ux-onboarding-trigger\",\"file_sha256\":\"bd5c5b7bee653b0cd0d130b61f1e63038cf7bb2a831eee47695813a596fbf814\",\"content_sha256\":\"3de879250f5d147f7c54293f0cf71be5a26201366c1591597480a2a959c0939c\",\"file_bytes\":1303,\"body_bytes\":231},{\"atom_id\":\"hooked-ux-regulatory\",\"file_sha256\":\"598795e96eb1d6455a101506f8a3c43c4ffaef37d8170049eb09f2cdb2694234\",\"content_sha256\":\"6cf1c7f28d98f567dc55b5f2c66d6a7e676bc66f53be58ec298e4c98a7943c8f\",\"file_bytes\":1310,\"body_bytes\":230},{\"atom_id\":\"hooked-ux-score\",\"file_sha256\":\"7607a2f4d54ee668d01b0a0b9c84dca512265e668c710a7780fbb1128dc98bf2\",\"content_sha256\":\"4bf064f6e6272d1638eee59281ca4580221be2927237016cd4ea979739e7ed3c\",\"file_bytes\":1841,\"body_bytes\":767}]"
carrier_sha256: 8696da419019078d555904a8a70dc4e1795e77e3e9b429bb97044b0aedd8b6ac
carrier_bytes: 11801
revision: 1
status: active
---
<!-- vpmodule:atom:begin hooked-ux-manipulation-matrix -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-manipulation-matrix
title: Apply the manipulation matrix
summary: "Classify the product as Facilitator, Peddler, Entertainer or Dealer by whether the maker uses it and whether it materially improves users' lives."
capability_tags: []
pattern_tags:
  - habit-ethics
conditions_applies_when: Evaluating the ethics of a habit-forming product.
conditions_does_not_apply_when: A non-habit-forming utility.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The matrix quadrant and its two inputs are stated.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L162-L172"
status: active
revision: 1
---

# Apply the manipulation matrix

Evaluate habit-forming product ethics by whether the maker uses the product and whether it materially improves users' lives: Maker uses plus improvement is Facilitator; maker does not use plus improvement is Peddler; maker uses without improvement is Entertainer; no use and no improvement is Dealer. Ask whether the maker would use it, whether it genuinely helps users achieve their goals, and whether it exploits vulnerabilities or serves needs.
<!-- vpmodule:atom:end hooked-ux-manipulation-matrix -->
<!-- vpmodule:atom:begin hooked-ux-onboarding-action -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-onboarding-action
title: Design the first onboarding action
summary: "Make the core action completable in under 60 seconds, remove friction and use a familiar interface that requires no new learning."
capability_tags: []
pattern_tags:
  - onboarding-hook
conditions_applies_when: Designing the first action in onboarding.
conditions_does_not_apply_when: A complex setup that cannot be shortened.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The action completes in under 60 seconds with a familiar interface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L194-L197"
status: active
revision: 1
---

# Design the first onboarding action

For the first action in onboarding, make the core action completable in under 60 seconds, remove friction, and use a familiar UI that requires no new learning.
<!-- vpmodule:atom:end hooked-ux-onboarding-action -->
<!-- vpmodule:atom:begin hooked-ux-onboarding-investment -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-onboarding-investment
title: Design the first onboarding investment
summary: "Ask for a small but meaningful investment only after the reward, and ensure it loads the next trigger."
capability_tags: []
pattern_tags:
  - onboarding-hook
conditions_applies_when: Designing the first investment in onboarding.
conditions_does_not_apply_when: A payment requested before any value.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The investment follows the reward and loads the next trigger.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L202-L205"
status: active
revision: 1
---

# Design the first onboarding investment

For the first investment in onboarding, ask for a small but meaningful investment only after the reward, and ensure it loads the next trigger.
<!-- vpmodule:atom:end hooked-ux-onboarding-investment -->
<!-- vpmodule:atom:begin hooked-ux-onboarding-loop -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-onboarding-loop
title: Complete the onboarding loop
summary: "Provide a clear path back to the trigger, send external triggers at appropriate times, and measure progression through the Hook."
capability_tags: []
pattern_tags:
  - onboarding-hook
conditions_applies_when: Closing the first onboarding cycle.
conditions_does_not_apply_when: An onboarding flow that ends without a return path.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "A return path exists, triggers are timed and progression is measured."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L206-L209"
status: active
revision: 1
---

# Complete the onboarding loop

For loop completion in onboarding, provide a clear path back to the trigger, send external triggers at appropriate times, and measure progression through the Hook.
<!-- vpmodule:atom:end hooked-ux-onboarding-loop -->
<!-- vpmodule:atom:begin hooked-ux-onboarding-reward -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-onboarding-reward
title: Design the first onboarding reward
summary: "Provide immediate feedback with a variable element such as surprise or delight, and connect the reward to an internal trigger."
capability_tags: []
pattern_tags:
  - onboarding-hook
conditions_applies_when: Designing the first reward in onboarding.
conditions_does_not_apply_when: A delayed reward outside the first session.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The reward is immediate, variable and linked to an internal trigger."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L198-L201"
status: active
revision: 1
---

# Design the first onboarding reward

For the first reward in onboarding, provide immediate feedback with a variable element such as surprise or delight, and connect the reward to an internal trigger.
<!-- vpmodule:atom:end hooked-ux-onboarding-reward -->
<!-- vpmodule:atom:begin hooked-ux-onboarding-trigger -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-onboarding-trigger
title: Design the first onboarding trigger
summary: "Make the first action obvious and easy, choose the right external trigger, and make the value proposition clear before asking for investment."
capability_tags: []
pattern_tags:
  - onboarding-hook
conditions_applies_when: Designing the first onboarding step.
conditions_does_not_apply_when: A returning-user flow.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The first trigger is clear, the action is obvious and the value proposition precedes investment."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L190-L193"
status: active
revision: 1
---

# Design the first onboarding trigger

For the first trigger in onboarding, make the first action obvious and easy, choose the right external trigger for the user, and make the value proposition clear before requesting investment.
<!-- vpmodule:atom:end hooked-ux-onboarding-trigger -->
<!-- vpmodule:atom:begin hooked-ux-regulatory -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-regulatory
title: Watch the applicable regulation
summary: "Watch children's privacy rules such as COPPA and GDPR-K, dark-pattern enforcement, addictive notification practices and loot-box rules."
capability_tags: []
pattern_tags:
  - regulatory-watch
conditions_applies_when: Reviewing a habit-forming product for regulatory exposure.
conditions_does_not_apply_when: "A product with no minors, notifications or paid randomness."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names each applicable rule and its product surface.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L182-L185"
status: active
revision: 1
---

# Watch the applicable regulation

Watch emerging regulation concerning children's apps (including COPPA and GDPR-K), dark patterns and rising FTC enforcement, addictive notification practices, and expanding rules for loot boxes.
<!-- vpmodule:atom:end hooked-ux-regulatory -->
<!-- vpmodule:atom:begin hooked-ux-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-score
title: Score the engagement mechanics
summary: "Score four diagnostic rows at 2/1/0, calculate round(total/8 x 10), and apply the stated manipulation-matrix consequence."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Reviewing or creating engagement mechanics.
conditions_does_not_apply_when: A code review that does not assess engagement.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each row's value and the matrix consequence."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L24-L27"
status: active
revision: 1
---

# Score the engagement mechanics

When reviewing or creating product engagement mechanics, score the four Quick Diagnostic rows—internal trigger, dead-simple action, variable reward, and investment loading the next trigger—at 2 when fully satisfied, 1 when partial, and 0 when absent; calculate round(total / 8 × 10). If the Manipulation Matrix classifies the product as Dealer, or any When NOT to Use condition applies, cap the score at 3 regardless of mechanics. Scores 9–10 mean a complete loop with an identified internal trigger and clear ethics; 5–6 mean a working loop that leans on external triggers or predictable rewards; 3 or below means a broken loop or extractive design. Always state the current score and the diagnostic rows preventing 10/10.
<!-- vpmodule:atom:end hooked-ux-score -->