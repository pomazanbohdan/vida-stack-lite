---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-hooked-ux-skill-md-c2564fb9-c03"
title: "wondelai-skills: skills/hooked-ux/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/hooked-ux/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/hooked-ux/SKILL.md\"}"
atom_ids:
  - hooked-ux-trigger
  - hooked-ux-variable-reward
  - hooked-ux-when-not-to-use
atom_count: 3
atoms: "[{\"atom_id\":\"hooked-ux-trigger\",\"file_sha256\":\"679be4e3d63235278f4af59ac407e585892ffd0fc05622435f4af57b8b92b253\",\"content_sha256\":\"716afc19bfed59431b23e2b06655cd97c5a80ab1f19174b467c5f1fb0c106006\",\"file_bytes\":1759,\"body_bytes\":620},{\"atom_id\":\"hooked-ux-variable-reward\",\"file_sha256\":\"c84e55ead13c9728cf55bdb879e256a1b8e72f2dec677507242f596846e26fb4\",\"content_sha256\":\"181e405f15c6c3f6590d5dced17fd2ccb48ead9281cfd7e2ce4f9eacafdfaed7\",\"file_bytes\":1676,\"body_bytes\":606},{\"atom_id\":\"hooked-ux-when-not-to-use\",\"file_sha256\":\"323de7f171d05abc43582bfffe479dca2a4098773bdbcc36ffa1b3af6e507d2f\",\"content_sha256\":\"b4b11380e61d13434ba818985bb01278c82ef89ec2f33eba9b1fcb64b039541b\",\"file_bytes\":1390,\"body_bytes\":310}]"
carrier_sha256: bb5cfc3dfd74b65f1832ad31335ded033d8d713a9cb50865afd6ab03cd444e47
carrier_bytes: 5132
revision: 1
status: active
---
<!-- vpmodule:atom:begin hooked-ux-trigger -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-trigger
title: Design the trigger
summary: "Use external cues such as notifications, email or ads, or internal emotional cues, to move users from external to internal triggers; map the product to the negative emotion it resolves and never trigger vulnerable states."
capability_tags: []
pattern_tags:
  - internal-trigger
conditions_applies_when: "Designing a notification, prompt or emotional cue."
conditions_does_not_apply_when: A product with no repeat trigger.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The trigger names its cue, timing and target emotion, and excludes vulnerable states."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L30-L57"
status: active
revision: 1
---

# Design the trigger

A trigger actuates behavior and may be external (environment-driven, such as notifications, email, or ads) or internal (emotion-driven); the goal is to move users from external to internal triggers. Map the product to the specific negative emotion it resolves. External triggers should be well-timed, actionable, and lead to the simplest next action; if users still need external prompts after about 30 days, no internal trigger has formed. Do not trigger behavior from vulnerable emotional states such as depression, addiction, or grief, where users cannot exercise the autonomy the loop assumes.
<!-- vpmodule:atom:end hooked-ux-trigger -->
<!-- vpmodule:atom:begin hooked-ux-variable-reward -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-variable-reward
title: Design the variable reward
summary: "Use tribe, hunt or self rewards with unpredictable variation, preserve autonomy, and treat consistent regret or anxiety as an extractive reward system."
capability_tags: []
pattern_tags:
  - variable-reward
conditions_applies_when: Designing the reward after an action.
conditions_does_not_apply_when: A fixed reward that cannot vary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The reward type, variability and stopping point are stated, and autonomy is preserved."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L86-L113"
status: active
revision: 1
---

# Design the variable reward

Variable Reward sustains return through anticipation of uncertain rewards, not the reward alone. Use the three reward types—tribe (social validation), hunt (resources or information), and self (mastery)—and avoid predictable rewards because their power fades; finite variability eventually becomes predictable, so aim for infinite variability. Preserve user autonomy because forced engagement backfires. If users consistently feel worse after engaging through regret, time loss, or anxiety, the system is extractive; avoid infinite scroll without natural stopping points.
<!-- vpmodule:atom:end hooked-ux-variable-reward -->
<!-- vpmodule:atom:begin hooked-ux-when-not-to-use -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-when-not-to-use
title: Do not use the Hook Model when it would harm users
summary: "Do not use the Hook Model when the product does not improve lives, targets vulnerable populations, depends on regret or conflicts with wellbeing."
capability_tags: []
pattern_tags:
  - habit-ethics
conditions_applies_when: Deciding whether to use habit-forming design.
conditions_does_not_apply_when: "A product that genuinely improves users' lives."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each exclusion is checked and any match stops the design.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L173-L181"
status: active
revision: 1
---

# Do not use the Hook Model when it would harm users

Do not use the Hook Model when the product does not genuinely improve lives, targets vulnerable populations such as children or addiction-prone users, depends on user regret for its business model, or creates engagement that conflicts with user wellbeing.
<!-- vpmodule:atom:end hooked-ux-when-not-to-use -->