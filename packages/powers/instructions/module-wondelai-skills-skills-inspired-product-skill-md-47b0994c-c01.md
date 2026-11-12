---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-inspired-product-skill-md-47b0994c-c01"
title: "wondelai-skills: skills/inspired-product/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/inspired-product/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/inspired-product/SKILL.md\"}"
atom_ids:
  - inspired-assess-opportunity
  - inspired-common-mistakes
  - inspired-continuous-delivery
  - inspired-diagnostic
  - inspired-discovery-and-delivery
  - inspired-durable-team
  - inspired-empowered-teams
  - inspired-score-product-organization
atom_count: 8
atoms: "[{\"atom_id\":\"inspired-assess-opportunity\",\"file_sha256\":\"c496f0e33f00836d77ff874b385c78f99ce16de3f349621dadb2a4f70bb3ddb6\",\"content_sha256\":\"b8b8e611f72b0c0ad7b2acd63eb72701e672b942c6c60690e41916e7910f86f3\",\"file_bytes\":1419,\"body_bytes\":212},{\"atom_id\":\"inspired-common-mistakes\",\"file_sha256\":\"439a658842bb67eecdf0ddd97f8668029787f4973b9ec29ccae6b3b606c34d21\",\"content_sha256\":\"c357a3270409ba8afd1516b03a8db8d1e5aa4f4f6f57b966db2ff839f5821c39\",\"file_bytes\":1414,\"body_bytes\":280},{\"atom_id\":\"inspired-continuous-delivery\",\"file_sha256\":\"ca1c2de7e5352c8e6b4c4e3c00a6d4e04565e7ad355dd43d6980b574ec685cf2\",\"content_sha256\":\"0b0235202d7c3b8ae3fafafe8a1af3b1911dfcd354d62f5ec45b72f35f4f0828\",\"file_bytes\":1285,\"body_bytes\":184},{\"atom_id\":\"inspired-diagnostic\",\"file_sha256\":\"c0ca18b90fa6004ee2b97cf7c8ce59aa03e697b7ac4b03de3bde79196c7b04e1\",\"content_sha256\":\"b0b30485992fc31adeb6c6ecc8cc0c3dca8387daada00df6eda54d1b6a89725d\",\"file_bytes\":1485,\"body_bytes\":332},{\"atom_id\":\"inspired-discovery-and-delivery\",\"file_sha256\":\"11109e9edf55a42ec0ca40e724ff44a9905ed52508008f3ce09c054a2f1a256b\",\"content_sha256\":\"9668886358f8821d98b3e6b9132da841f882a4a558535a902ce60cf924734462\",\"file_bytes\":1421,\"body_bytes\":306},{\"atom_id\":\"inspired-durable-team\",\"file_sha256\":\"a37003540f88190df03053307475250cb0dc480cad7c1aa463fb72760098e366\",\"content_sha256\":\"fd5ec771324ce0eba729c0fd4ddeca6ae802392dd2e588211fe736dc0c03b107\",\"file_bytes\":1350,\"body_bytes\":236},{\"atom_id\":\"inspired-empowered-teams\",\"file_sha256\":\"b636a1e2c2af3416593e344f05db5fe8198f4e5f949f6caa7e74a7fcaacb731d\",\"content_sha256\":\"49bc0d48c4796ff420f6f361f16cd261319d736b6385248d88ade9f8060159de\",\"file_bytes\":1302,\"body_bytes\":183},{\"atom_id\":\"inspired-score-product-organization\",\"file_sha256\":\"3187a49ba8f1780e005b9c7dcf7b2653d00eb5ea924bba4b959061dcf2b7363e\",\"content_sha256\":\"94f2a9f2c74233f8b07c22147c1965a5ff062f4db3635caa97f16ec08d18534a\",\"file_bytes\":1722,\"body_bytes\":561}]"
carrier_sha256: 7177e0a15c1e45caab2cbcfc1db87592d32de097a930803c622e5cdcd8b869ce
carrier_bytes: 12279
revision: 1
status: active
---
<!-- vpmodule:atom:begin inspired-assess-opportunity -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-assess-opportunity
title: Assess an opportunity before investing
summary: "Evaluate business value, customer need severity, market context and organizational readiness against structured questions."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - working-backwards
conditions_applies_when: Deciding whether to invest in a product opportunity.
conditions_does_not_apply_when: A small enhancement with no meaningful investment decision.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - business_value
  - customer_need
  - market
  - readiness
artifact_contract_verified_by: "The assessment answers the structured questions for value, need, market and readiness."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L99-L123"
status: active
revision: 1
---

# Assess an opportunity before investing

Before investing in any opportunity, evaluate business value, customer need severity, market context, and organizational readiness against a structured set of questions.
<!-- vpmodule:atom:end inspired-assess-opportunity -->
<!-- vpmodule:atom:begin inspired-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-common-mistakes
title: Avoid common product-organization mistakes
summary: "Avoid project-manager PMs, skipped discovery, output metrics, handed-down solutions, isolated engineers and dated feature roadmaps."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a product organization for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the outcome-centered correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L174-L184"
status: active
revision: 1
---

# Avoid common product-organization mistakes

Avoid project-manager PMs, skipped discovery, output metrics, handed-down solutions, isolated engineers, and dated feature roadmaps; require evidence, outcome measures, problem ownership, engineer participation, and outcome roadmaps.
<!-- vpmodule:atom:end inspired-common-mistakes -->
<!-- vpmodule:atom:begin inspired-continuous-delivery -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-continuous-delivery
title: Deliver small validated increments continuously
summary: "Treat delivery as a continuous flow of small validated increments to real users, not a launch event."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - revertable-increments
conditions_applies_when: Releasing product changes to users.
conditions_does_not_apply_when: A one-off release with no ongoing product flow.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Validated increments reach real users on a continuous cadence rather than a single launch.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L149-L173"
status: active
revision: 1
---

# Deliver small validated increments continuously

Delivery is not a launch event but a continuous flow of small, validated increments shipped to real users as frequently as possible.
<!-- vpmodule:atom:end inspired-continuous-delivery -->
<!-- vpmodule:atom:begin inspired-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-diagnostic
title: Run the empowered-product-team diagnostic
summary: "Check customer knowledge, pre-build testing, engineer participation, outcome ownership, vision understanding, problem framing and validated increments."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A quick diagnostic review of a product organization.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L185-L196"
status: active
revision: 1
---

# Run the empowered-product-team diagnostic

Assess direct customer knowledge, pre-build real-user testing, engineer discovery participation, outcome ownership, vision/strategy understanding, problem-framed stakeholder requests, and validated increments at least every two weeks; use each listed corrective action when a row fails.
<!-- vpmodule:atom:end inspired-diagnostic -->
<!-- vpmodule:atom:begin inspired-discovery-and-delivery -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-discovery-and-delivery
title: Run discovery and delivery as parallel tracks
summary: Resolve product risks in discovery before engineering investment while delivery builds production-quality software.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Planning product work from idea to production.
conditions_does_not_apply_when: A maintenance change with no product uncertainty.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Discovery addresses the product risks before delivery commits engineering effort.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L26-L49"
status: active
revision: 1
---

# Run discovery and delivery as parallel tracks

Product work runs on two parallel tracks: discovery determines what to build by addressing risks before engineering investment; delivery builds production-quality software. Most organizations skip discovery entirely, jumping from idea to backlog to sprint.
<!-- vpmodule:atom:end inspired-discovery-and-delivery -->
<!-- vpmodule:atom:begin inspired-durable-team -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-durable-team
title: Form a small durable cross-functional team
summary: "Give a small product, design and engineering group a problem to solve, with accountability for outcomes rather than output."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Forming or reviewing a product team.
conditions_does_not_apply_when: A short-lived team assembled only for a fixed deliverable.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The team is durable, cross-functional and measured by outcomes rather than output."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L50-L74"
status: active
revision: 1
---

# Form a small durable cross-functional team

A small, durable, cross-functional group (product manager, product designer, engineers) given a problem to solve, owning discovery and delivery, accountable for outcomes rather than output.
<!-- vpmodule:atom:end inspired-durable-team -->
<!-- vpmodule:atom:begin inspired-empowered-teams -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-empowered-teams
title: "Give teams problems, not feature lists"
summary: Use cross-functional teams that own discovery and delivery end to end and are accountable for solving a problem.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Structuring a product team or assigning product work.
conditions_does_not_apply_when: A temporary component team that only executes a fixed specification.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The team receives a problem to solve and owns both discovery and delivery.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L14-L19"
status: active
revision: 1
---

# Give teams problems, not feature lists

Empowered product teams = cross-functional groups given problems to solve (not features to build) who own discovery and delivery end-to-end.
<!-- vpmodule:atom:end inspired-empowered-teams -->
<!-- vpmodule:atom:begin inspired-score-product-organization -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: inspired-score-product-organization
title: Score the product organization
summary: "Score the seven diagnostic rows, report the current score and the failed rows to fix for 7/7."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Assessing team structure, discovery practice or delivery process."
conditions_does_not_apply_when: A narrow delivery review that does not assess product organization.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
  - fixes
artifact_contract_verified_by: The report states the current score and the specific failed rows to fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/inspired-product/SKILL.md; sha256=482ab6a32bb59b087a06812711959624e9afec1b73c34d5d6774c565cc2bdb14; locator=skills/inspired-product/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the product organization

Goal: 7/7. Score product team structures, discovery practices, or delivery processes by the Quick Diagnostic below -- 1 point per satisfied row, scored 0-7. Bands: 6-7 = empowered teams own outcomes and discovery runs continuously with engineers; 4-5 = discovery happens but inconsistently, or teams own output with partial outcome accountability; <=3 = a feature factory: teams receive a roadmap of dated features and skip discovery. Always state the current score and the specific failed diagnostic rows to fix to reach 7/7.
<!-- vpmodule:atom:end inspired-score-product-organization -->