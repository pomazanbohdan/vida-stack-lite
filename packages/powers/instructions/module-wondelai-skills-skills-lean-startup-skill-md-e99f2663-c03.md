---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-startup-skill-md-e99f2663-c03"
title: "wondelai-skills: skills/lean-startup/SKILL.md module"
summary: "Carrier for 5 atomic instructions from wondelai-skills:skills/lean-startup/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-startup/SKILL.md\"}"
atom_ids:
  - lean-startup-stages
  - lean-startup-sticky-engine
  - lean-startup-tune-the-engine
  - lean-startup-validated-learning
  - lean-startup-viral-engine
atom_count: 5
atoms: "[{\"atom_id\":\"lean-startup-stages\",\"file_sha256\":\"14b916ee6caee3fc8483de33116ec3ea7f6cf7c5197f4bd9c725f4b092f3b98e\",\"content_sha256\":\"8d57179fab937b1172b8eeead8a46066583aeb95963bdf873fd493cc7c372c63\",\"file_bytes\":1371,\"body_bytes\":272},{\"atom_id\":\"lean-startup-sticky-engine\",\"file_sha256\":\"d993a4f32fb2c2da80db6e43febd9c9c570ae68e0ce36ba93cb113f7b1981dd1\",\"content_sha256\":\"40bd7973846fd908af9bf10e7127200a883fe94c4b1743a3ee22af2f3bf4dc2c\",\"file_bytes\":1362,\"body_bytes\":289},{\"atom_id\":\"lean-startup-tune-the-engine\",\"file_sha256\":\"0de909487cba9aa758f8839e6bd512ad7652746c6469ebfc4b2c2101a517652e\",\"content_sha256\":\"3e768b8b1895c58890de481e645d2853135ae8ab394a4d9afcc47ffaed5c6872\",\"file_bytes\":1332,\"body_bytes\":271},{\"atom_id\":\"lean-startup-validated-learning\",\"file_sha256\":\"5bbaafbb123a199f7b2e1107abac312c5de09a8ddaa5e69b694aadd2169b1fc2\",\"content_sha256\":\"8ede77c6d0cdfb72614d87b1967f2f8488bd31ab71e0615bd00ac0190fc6cf2d\",\"file_bytes\":1480,\"body_bytes\":365},{\"atom_id\":\"lean-startup-viral-engine\",\"file_sha256\":\"94dbc6dcde3a181894441ddefd189dd59fb82ed0330abf16439cc05c41b18805\",\"content_sha256\":\"8299c14d4f7111796fe6cf4e250fe3760d5dd68273121bc7e21a6c92fde976bf\",\"file_bytes\":1408,\"body_bytes\":335}]"
carrier_sha256: 52d7ddaf96525f6fb29d19e64f593371ac78f9018b3e616132727d35f248cbbc
carrier_bytes: 7500
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-startup-stages -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-stages
title: "Move through problem, product and scale stages"
summary: "Establish problem/solution fit and product/market fit before scaling, adapting metrics and safeguards to the context."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Planning the stage of a new product or feature.
conditions_does_not_apply_when: A mature product already at scale.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan names its current fit stage and does not optimize for scale before validation.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L201-L215"
status: active
revision: 1
---

# Move through problem, product and scale stages

Move through problem/solution fit, product/market fit, then scale; do not skip early validation. Adapt metrics and safeguards to SaaS, corporate innovation, or product features and base feature choices on experiment data.
<!-- vpmodule:atom:end lean-startup-stages -->
<!-- vpmodule:atom:begin lean-startup-sticky-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-sticky-engine
title: Operate a sticky growth engine
summary: "Track churn, retention cohorts and DAU/MAU so natural growth exceeds churn."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "A subscription, social or SaaS product using retention-led growth."
conditions_does_not_apply_when: A one-off purchase with no retention motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The engine measures churn and retention and states when natural growth exceeds churn.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L157-L160"
status: active
revision: 1
---

# Operate a sticky growth engine

Retention-driven: `growth rate = new customer acquisition rate − churn rate`. Track churn rate, retention cohorts (30/60/90 days), and DAU/MAU. Fits SaaS, subscriptions, social networks. Strategy: improve the product until natural growth exceeds churn.
<!-- vpmodule:atom:end lean-startup-sticky-engine -->
<!-- vpmodule:atom:begin lean-startup-tune-the-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-tune-the-engine
title: Tune the engine with experiments
summary: "Run experiments on pricing, onboarding and acquisition channels, each targeting a measurable improvement."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Improving baseline product metrics.
conditions_does_not_apply_when: An experiment with no measurable target.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each experiment has a baseline, a target metric and a validated-learning result."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L98-L101"
status: active
revision: 1
---

# Tune the engine with experiments

Run experiments to improve baseline metrics: A/B test pricing ($9 vs. $19/mo), onboarding completion rates, acquisition channels (SEO vs. paid vs. referral). Each experiment targets a measurable improvement through validated learning.
<!-- vpmodule:atom:end lean-startup-tune-the-engine -->
<!-- vpmodule:atom:begin lean-startup-validated-learning -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-validated-learning
title: Measure validated learning
summary: "Learn from real behavior through falsifiable experiments, measure what customers do rather than say, and reject vanity wins."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Evaluating whether product work produces learning.
conditions_does_not_apply_when: A feature request or opinion survey with no behavioral evidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The evidence comes from observed behavior and could have falsified the assumption.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L41-L56"
status: active
revision: 1
---

# Measure validated learning

Learning what customers really want through experiments on real behavior—not feature requests, surveys, or focus groups (people mispredict their own behavior). Measure what customers do, not what they say, and run experiments that could falsify your assumptions. Vanity wins (downloads, signups without engagement) are not learning.
<!-- vpmodule:atom:end lean-startup-validated-learning -->
<!-- vpmodule:atom:begin lean-startup-viral-engine -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-startup-viral-engine
title: Operate a viral growth engine
summary: "Track the viral coefficient, cycle time and referral attribution, and build virality into the product."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: A product whose customers bring other customers.
conditions_does_not_apply_when: A product with no sharing or invitation motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The viral coefficient and cycle time are measured, with a target above 1.0."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-startup/SKILL.md; sha256=109bf176baf1c56f0d02f6a8a2d59d7969b64768a760bc7624516a8b42b5bf53; locator=skills/lean-startup/SKILL.md#L161-L164"
status: active
revision: 1
---

# Operate a viral growth engine

Customers bring customers: `viral coefficient = (% who invite) × (invites sent) × (% who join)`; above 1.0 means exponential, self-sustaining growth. Track the coefficient, viral cycle time, and referral attribution. Fits Dropbox, Hotmail, WhatsApp. Strategy: build virality into the product itself.
<!-- vpmodule:atom:end lean-startup-viral-engine -->