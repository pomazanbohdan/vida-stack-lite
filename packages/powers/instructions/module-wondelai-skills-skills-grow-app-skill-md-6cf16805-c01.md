---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-grow-app-skill-md-6cf16805-c01"
title: "wondelai-skills: skills/grow-app/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/grow-app/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/grow-app/SKILL.md\"}"
atom_ids:
  - grow-app-activation
  - grow-app-apply
  - grow-app-common-mistakes
  - grow-app-complete
  - grow-app-core
  - grow-app-discovery
  - grow-app-experiments
  - grow-app-hook
atom_count: 8
atoms: "[{\"atom_id\":\"grow-app-activation\",\"file_sha256\":\"dafef46cfd6031ca4c265ae9d167b89886ffedc6064f7e6488968f01b432a33e\",\"content_sha256\":\"01ec92911741c7b6491d6030fc4e1659a6a320fa47ec7adc01327e4268d2fc99\",\"file_bytes\":2275,\"body_bytes\":1075},{\"atom_id\":\"grow-app-apply\",\"file_sha256\":\"baf1687c828afa6cd38212b96268093110073ee05886e10d88036ff0052c60de\",\"content_sha256\":\"72c53794ad23fb23dbf7b9b6dc266b02e7a07c239d5bc952c569599bc93962d4\",\"file_bytes\":1519,\"body_bytes\":333},{\"atom_id\":\"grow-app-common-mistakes\",\"file_sha256\":\"148b4098c564f50bb0e1eb38b0f1977f5e4a9dd9c169dfc5da1b14f13c5b3350\",\"content_sha256\":\"90c7668e61330cf8a9bb31596adb33aad7a367dd45b85ddb074d898743ce8ec7\",\"file_bytes\":1903,\"body_bytes\":755},{\"atom_id\":\"grow-app-complete\",\"file_sha256\":\"d8aff82bc74e284afc6a72fa57ac1866cc628a27de8d2d7797f2c85ebbd25d24\",\"content_sha256\":\"90da266efd9aba2f98ad77dae91dc824eae2a0e89f79bdb266d793822201359f\",\"file_bytes\":2036,\"body_bytes\":903},{\"atom_id\":\"grow-app-core\",\"file_sha256\":\"e339c3f0462cfc6936064d05b16f191f6ae699d397afa1d99a84fdb7ba91f6c6\",\"content_sha256\":\"540c8078aaefe42ca8e73986e0fbc3a3cf36e2b7b8c3f5c0c3821a3e13154f15\",\"file_bytes\":1424,\"body_bytes\":276},{\"atom_id\":\"grow-app-discovery\",\"file_sha256\":\"f582bb4d2793af72190b74b92c1490c188b186b55b2f772462d50470b7a19247\",\"content_sha256\":\"2d48c655a0bc90cf2b28e01fbc085bdfcecec32084e8aa97fdb57f97042dad5d\",\"file_bytes\":2291,\"body_bytes\":1089},{\"atom_id\":\"grow-app-experiments\",\"file_sha256\":\"efa8619192c73357f9e1791755d4bc6b0a55b7921e2a545a4b289d8fbbf35a07\",\"content_sha256\":\"6f0964e75e40c04d5474461f622af4019a586b17ca2296d7d2ee683d75b7c13d\",\"file_bytes\":2266,\"body_bytes\":997},{\"atom_id\":\"grow-app-hook\",\"file_sha256\":\"6e3895070649ca0cc29d86dbf076b46524a97e3ee9602aed5d1f64a4b95766c3\",\"content_sha256\":\"a9883d98a01aabba586fc6aed7d7e1afd469e7889046ac75b38c39401878d7e0\",\"file_bytes\":2390,\"body_bytes\":1171}]"
carrier_sha256: 3950dfede8713dbb3fc7ae55b15c5cb3f3c72bab03837d2cbba8ffda5e2c1519
carrier_bytes: 16843
revision: 1
status: active
---
<!-- vpmodule:atom:begin grow-app-activation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-activation
title: Fix activation friction
summary: "Use B=MAP to raise ability, rate all six Ability-Chain factors, fix the scarcest, ship a Starter Step that delivers value in under 30 seconds, anchor it to a routine and convert or drop prompts by the appreciation test."
capability_tags:
  - design-retention-engine
pattern_tags:
  - starter-step
conditions_applies_when: New users do not reach the core loop.
conditions_does_not_apply_when: A retention leak caused by missing engagement mechanics rather than friction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The scarcest resource, Starter Step, celebration and prompt changes are recorded with owners."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L79-L95"
status: active
revision: 1
---

# Fix activation friction

Reduce activation friction using B=MAP: behavior occurs when Motivation, Ability and Prompt converge; because motivation is unreliable, improve Ability, whose simplicity is capped by the scarcest of time, money, physical effort, mental effort, social deviance and non-routineness. Make the Starter Step valuable in under 30 seconds, anchor it to an existing routine and celebrate immediately. Audit the real activation flow and day-1/7/30 drop-offs, rate all six Ability-Chain factors, name the scarcest resource, redesign the Starter Step and set event-based prompts. Ask the user to choose the scarcest resource to fix first, the Starter Step and celebration, and which time-based prompts become event-based; drop prompts failing “would I appreciate this now?”. Record fixes and owners in PRODUCT.md Activation & Retention Plan and update tracker. Done when the scarcest resource, step, celebration and prompt changes are recorded with owners, each day-1/7/30 drop-off is mapped to a likely B=MAP failure, and the user approves the fix list.
<!-- vpmodule:atom:end grow-app-activation -->
<!-- vpmodule:atom:begin grow-app-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-apply
title: Run the app-growth journey
summary: "For an app whose users sign up and disappear, guide eight interactive phases toward activation, habit and valued engagement; ask before every decision, record outcomes in docs and treat growth as a design problem."
capability_tags:
  - design-retention-engine
pattern_tags:
  - resumable-journey
conditions_applies_when: An app with signups followed by abandonment and no obvious breakage.
conditions_does_not_apply_when: An app with no users or a product broken by UX or performance.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The journey names the phases and the docs that record each decision.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L10-L13"
status: active
revision: 1
---

# Run the app-growth journey

For an app whose users sign up and then disappear, guide them through eight interactive phases toward activation, habitual use, and valued engagement. Ask the user before every decision, record outcomes in docs/ so work can resume across sessions, and treat growth as an engineering and design problem.
<!-- vpmodule:atom:end grow-app-apply -->
<!-- vpmodule:atom:begin grow-app-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-common-mistakes
title: Avoid the listed growth mistakes
summary: "Avoid buying growth before retention, relying forever on external triggers, optimizing the wrong Ability-Chain link, jumping from outcome to solution, measuring outputs and gamifying everything; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a growth plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L211-L221"
status: active
revision: 1
---

# Avoid the listed growth mistakes

Avoid buying growth before retention: pass the Stickiness gate, a flattening cohort curve, before any acquisition spend and keep acquisition phases locked per Rule 8. Migrate from permanent external triggers to internal triggers through hooked-ux, treating notifications as scaffolding. In improve-retention, rate all six Ability-Chain factors and fix the scarcest resource. In continuous-discovery, build the Opportunity Solution Tree before solutions. Instrument every release and define success in lean-ux/inspired-product as changed user behavior rather than shipped stories. In drive-motivation, reserve points/rewards for meaningful milestones and run the AMP audit because if-then rewards crowd out power users.
<!-- vpmodule:atom:end grow-app-common-mistakes -->
<!-- vpmodule:atom:begin grow-app-complete -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-complete
title: Close or route the journey
summary: "Meet the intake retention bar or quantify the gap before acquisition; verify the hook, activation, opportunity tree, OMTM, one resolved experiment and clean engagement design; close the tracker and route to improve-app or grow-business."
capability_tags:
  - design-retention-engine
pattern_tags: []
conditions_applies_when: Closing a grow-app journey.
conditions_does_not_apply_when: A journey still in its first phases.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every exit-check item is tied to an artifact and the next route is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L222-L233"
status: active
revision: 1
---

# Close or route the journey

Before acquisition phases run, meet the retention bar set at Intake or quantify the remaining gap. Journey completion requires PRODUCT.md to contain a Hook loop with its weakest phase fixed, activation Starter Step, living Opportunity Solution Tree, and AMP-clean engagement design; METRICS.md to name the Stickiness-stage OMTM, counter-metric, target, date, and miss response; at least one resolved lean-ux experiment with recorded verdict and invalidated ideas removed from the backlog; and the intake retention bar met or its gap quantified. Close the tracker with every phase done or skipped and carry Next Actions into PRODUCT.md, METRICS.md, and EXPERIMENTS.md. Route to improve-app if broken UX or performance prevents engagement mechanics from fixing the product; route to grow-business when the app is sticking and revenue, channels, or operations must keep pace.
<!-- vpmodule:atom:end grow-app-complete -->
<!-- vpmodule:atom:begin grow-app-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-core
title: Fix retention before acquisition
summary: "Fix habit, activation and retention before spending on acquisition; sequence the phases, ask at every decision and use the constituent skills instead of improvising their methods."
capability_tags:
  - design-retention-engine
pattern_tags:
  - retention-before-acquisition
conditions_applies_when: Growth work on an app with weak retention.
conditions_does_not_apply_when: A pure acquisition problem with a proven retention curve.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: No acquisition spend or acquisition phase runs before the retention bar is met.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L14-L17"
status: active
revision: 1
---

# Fix retention before acquisition

Fix habit, activation, and retention before spending on acquisition. Sequence the eight phases, ask about each decision, and record each choice in docs/. Use the constituent skills for their methods instead of improvising their frameworks.
<!-- vpmodule:atom:end grow-app-core -->
<!-- vpmodule:atom:begin grow-app-discovery -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-discovery
title: Run continuous discovery
summary: "Hold at least one weekly customer touchpoint, build an Opportunity Solution Tree from outcome to customer-worded opportunities to solutions, use story-based interview snapshots and test the riskiest leap-of-faith assumption cheaply."
capability_tags:
  - design-retention-engine
pattern_tags:
  - opportunity-tree
conditions_applies_when: "Replacing generic best practice with evidence from the app's users."
conditions_does_not_apply_when: A team with no user access and no plan to get it.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The tree, cadence, snapshot template and cheapest risk test are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L96-L113"
status: active
revision: 1
---

# Run continuous discovery

Replace generic best practice and guesses with at least one weekly customer touchpoint and evidence about the app's own users. Build an Opportunity Solution Tree from outcome to customer-worded opportunities to candidate solutions/experiments; never jump directly from outcome to solution. Use story-based interviews about a recent event, capture one-page snapshots, and cheaply test the riskiest leap-of-faith assumption first. With continuous-discovery, produce the tree, a current-state experience map of churned users, weekly interview snapshot template and next-feature assumption map. Ask the user for one outcome, two or three opportunities, a sustainable weekly cadence and recruitment mechanism or degraded mode, and the riskiest desirability/viability/feasibility/usability assumption plus cheapest test. Record tree, roadmap, cadence and interview evidence in the named PRODUCT.md and CUSTOMER.md sections and update tracker. Done when outcome/opportunities are recorded, cadence scheduled, first snapshot template exists and cheap test is designed.
<!-- vpmodule:atom:end grow-app-discovery -->
<!-- vpmodule:atom:begin grow-app-experiments -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-experiments
title: Replace debate with cheap experiments
summary: "Write a falsifiable hypothesis with a pre-committed metric and threshold, match fidelity to risk, use a paper prototype with five users for about 85% of usability issues, reserve A/B tests for proven concepts and remove invalidated ideas from the backlog."
capability_tags:
  - design-retention-engine
pattern_tags:
  - outcome-over-output
  - experiment-precommit
conditions_applies_when: Settling a design debate or testing a discovery opportunity.
conditions_does_not_apply_when: A decision with no testable behavior.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "At least one card has a pre-committed threshold and decision rule, and the backlog is triaged."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L114-L130"
status: active
revision: 1
---

# Replace debate with cheap experiments

Turn opportunities into falsifiable bets judged by behavior change rather than meetings or shipped outputs. Write a hypothesis in the specified outcome/persona/action/feature form and commit to its metric and threshold before testing. Match experiment fidelity to risk; a paper prototype with five users can identify about 85% of usability issues. Reserve A/B tests for tuning a proven concept. Remove invalidated ideas from the backlog instead of deferring them. Use the leading debate or discovery opportunity to generate three hypotheses and the lowest-fidelity experiment that answers the actual question, with a precommitted metric, threshold, and timebox. With the user, select the hypothesis, fidelity, pass/fail line, and what leaves the backlog on failure. Record an experiment card and triaged backlog in EXPERIMENTS.md. Completion requires a card with precommitted threshold and decision rule, a triaged backlog, and user's selected first test.
<!-- vpmodule:atom:end grow-app-experiments -->
<!-- vpmodule:atom:begin grow-app-hook -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-hook
title: Design the Hook loop
summary: "Build Trigger, Action, Variable Reward and Investment; migrate external triggers to an internal emotion, make the action trivial, vary reward across tribe, hunt and self, place investment after reward and check every reward against the Manipulation Matrix."
capability_tags:
  - design-retention-engine
pattern_tags:
  - habit-loop
  - manipulation-matrix
conditions_applies_when: Designing why users return without paid prompts.
conditions_does_not_apply_when: A one-off use with no repeat goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "All four phases are rated, the weakest is named and the first session completes one full loop."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L62-L78"
status: active
revision: 1
---

# Design the Hook loop

Design a Hook loop that brings users back through an internal trigger rather than a paid notification. In the fallback method, map Trigger → Action → Variable Reward → Investment; migrate external push/email triggers to internal emotions such as boredom, FOMO or anxiety, make the action trivially simple, vary reward across tribe/hunt/self, and place investment after reward so it raises switching cost and loads the next trigger. Treat any weak phase as stalling the loop. With hooked-ux, map and rate all four phases 0–10, identify the weakest, and design honest data-powered variable rewards checked against the Manipulation Matrix. Ask the user to confirm one internal trigger, choose the weakest phase and high-leverage fix or defer if the loop is already forming at 5%+ unprompted return, and choose a reward type while rejecting concepts that fail the matrix. Extend PRODUCT.md Hook Model with trigger, action, variable reward, investment, weakest phase and fix; update the tracker. Done only when all are recorded, onboarding lets a new user complete one full Hook cycle in the first session, and the user picked the fix to ship.
<!-- vpmodule:atom:end grow-app-hook -->