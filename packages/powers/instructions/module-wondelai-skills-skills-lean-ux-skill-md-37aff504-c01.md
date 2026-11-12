---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-lean-ux-skill-md-37aff504-c01"
title: "wondelai-skills: skills/lean-ux/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/lean-ux/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/lean-ux/SKILL.md\"}"
atom_ids:
  - lean-ux-agile-integration
  - lean-ux-behavior-over-deliverables
  - lean-ux-collaborative-design
  - lean-ux-common-mistakes
  - lean-ux-declare-assumptions
  - lean-ux-diagnostic
  - lean-ux-embedded-research
  - lean-ux-hypothesis-statements
atom_count: 8
atoms: "[{\"atom_id\":\"lean-ux-agile-integration\",\"file_sha256\":\"bb04e67fe5927ca4aa5210ecec7a77533d03dca03bb0c65d72dc6385f084158b\",\"content_sha256\":\"e3c5b2c7c72f7d3adc53fb3fe69114f14a3bf18d99777a79f1977398dd559aa8\",\"file_bytes\":1474,\"body_bytes\":280},{\"atom_id\":\"lean-ux-behavior-over-deliverables\",\"file_sha256\":\"fdd1640b4690789fe2ed2021eb5d497cfe67387347645319a0bb3a2c6eb70961\",\"content_sha256\":\"ba45c924515b6602b23da689c07d508d05ae078d19bb9cbf8f71cf47b6b7f01d\",\"file_bytes\":1365,\"body_bytes\":273},{\"atom_id\":\"lean-ux-collaborative-design\",\"file_sha256\":\"25ed0734b439108f588cdefec9fd973464cf36fc84ee11b413e98920051b2a97\",\"content_sha256\":\"e257b6d9c3c504f64242ac1313bc3989a72bac130952fb55890a63213ec735cf\",\"file_bytes\":1266,\"body_bytes\":179},{\"atom_id\":\"lean-ux-common-mistakes\",\"file_sha256\":\"c960f33c06240b862065a407d32176b33a5d6f4a67954c1c2ce7c6edb68731c3\",\"content_sha256\":\"7ab2ddf4250bab97e18c38b64c5819d9defcd50b3e27ead8b16648ef52bffe64\",\"file_bytes\":1407,\"body_bytes\":276},{\"atom_id\":\"lean-ux-declare-assumptions\",\"file_sha256\":\"e7ba6f8bf92dcf69ea3dc2e58544b36e0e5f239b65985d1c68e974579e8b1d19\",\"content_sha256\":\"f67c25e257bf6452784dd7d1f330f9d089aaed4da24a7581929815a6a1bb4250\",\"file_bytes\":1248,\"body_bytes\":185},{\"atom_id\":\"lean-ux-diagnostic\",\"file_sha256\":\"b0ae5ef50fd25eab13677722e3f37630a916d5f0258aa5d2c4009a4cc55e5aa0\",\"content_sha256\":\"0ef2aa494e4a660b6461df301407e7fd0e4b748f7f429aa50d09461e0702dc30\",\"file_bytes\":1350,\"body_bytes\":223},{\"atom_id\":\"lean-ux-embedded-research\",\"file_sha256\":\"731cd905356afe58bed8898db8e1d239ead5f0242799041dd25adf156386898e\",\"content_sha256\":\"9ec16dc275fb1425513c88c0ea6454c46a4195804fc81341aeb79c5e6396b906\",\"file_bytes\":1338,\"body_bytes\":227},{\"atom_id\":\"lean-ux-hypothesis-statements\",\"file_sha256\":\"976f4a91c30cd33e781c99c215af93b6728e9555731e26e80fe3bccb9593bf2e\",\"content_sha256\":\"02dd53d43ec5f35a68192decf6f2d5167b1e788337aac560b186aa7c38a72137\",\"file_bytes\":1331,\"body_bytes\":230}]"
carrier_sha256: 3692cf2a7b20f87e933c203f45201b3f2f8b1b4c34dc493a69022eb2fbb1ce84
carrier_bytes: 11660
revision: 1
status: active
---
<!-- vpmodule:atom:begin lean-ux-agile-integration -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-agile-integration
title: Integrate discovery with Agile delivery
summary: "Run discovery one sprint ahead, add hypotheses and metrics to stories, count validated learning, remove invalidated backlog items, and never assume accessibility, security or compliance."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A dual-track product organization plans discovery and delivery.
conditions_does_not_apply_when: A team without a product discovery track.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Stories carry hypotheses and metrics, discovery leads delivery, and invalidated items leave the backlog."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L152-L177"
status: active
revision: 1
---

# Integrate discovery with Agile delivery

Run discovery/delivery in parallel, discovery one sprint ahead; add hypotheses/metrics to stories, count validated learning in UX completion, remove invalidated backlog items; never test accessibility/security/compliance as assumptions.
<!-- vpmodule:atom:end lean-ux-agile-integration -->
<!-- vpmodule:atom:begin lean-ux-behavior-over-deliverables -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-behavior-over-deliverables
title: Measure design by behavior change
summary: "Make assumptions explicit, test them with the smallest experiment, and use user behavior rather than deliverable fidelity as evidence."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Planning or evaluating design work.
conditions_does_not_apply_when: A purely aesthetic change with no behavioral hypothesis.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The work states a hypothesis and uses observed behavior as its evidence.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L14-L19"
status: active
revision: 1
---

# Measure design by behavior change

Measure design by user behavior change rather than deliverable fidelity; make assumptions explicit, hypothesize, run the smallest experiment, and use user behavior as evidence. Shared understanding and learning velocity guide the work.
<!-- vpmodule:atom:end lean-ux-behavior-over-deliverables -->
<!-- vpmodule:atom:begin lean-ux-collaborative-design -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-collaborative-design
title: Design collaboratively
summary: "Use diverge, present, critique, converge and iterate to reach informed commitment rather than design by committee."
capability_tags:
  - facilitate-a-group-discussion
pattern_tags:
  - collaborative-dialogue
conditions_applies_when: A cross-functional team is designing a solution.
conditions_does_not_apply_when: A solitary change with no shared design decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The team converges on an informed commitment rather than an averaged compromise.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L105-L128"
status: active
revision: 1
---

# Design collaboratively

Cross-functional teams sketch through diverge, present, critique, converge, iterate; seek informed commitment, not consensus; avoid design by committee.
<!-- vpmodule:atom:end lean-ux-collaborative-design -->
<!-- vpmodule:atom:begin lean-ux-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-common-mistakes
title: Avoid common Lean UX mistakes
summary: "Avoid treating an MVP as a launch, hidden assumptions, missing criteria, siloed design, ignored invalidations, documentation over collaboration and output metrics."
capability_tags:
  - stress-test-a-product-concept
pattern_tags:
  - adversarial-self-review
conditions_applies_when: Reviewing a Lean UX practice for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the behavior-centered correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L178-L190"
status: active
revision: 1
---

# Avoid common Lean UX mistakes

Avoid MVP-as-launch, hidden assumptions, missing criteria, siloed design/research, ignored invalidations, documentation over collaboration, and output metrics; use mapping, precommitment, co-design, sprint research, removal, behavior metrics.
<!-- vpmodule:atom:end lean-ux-common-mistakes -->
<!-- vpmodule:atom:begin lean-ux-declare-assumptions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-declare-assumptions
title: Declare and rank assumptions
summary: "List assumptions, rank them by risk and uncertainty, test the highest first, and disclose committed direction."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Starting design work under uncertainty.
conditions_does_not_apply_when: A change with no material assumption.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - assumptions
  - ranking
artifact_contract_verified_by: Assumptions are ranked and the highest-risk item is tested first.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L32-L55"
status: active
revision: 1
---

# Declare and rank assumptions

Declare assumptions, rank by risk and uncertainty, test highest-risk/uncertainty first, write collaboratively, and disclose when direction is committed.
<!-- vpmodule:atom:end lean-ux-declare-assumptions -->
<!-- vpmodule:atom:begin lean-ux-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-diagnostic
title: Run the Lean UX diagnostic
summary: "Audit assumptions, testable hypotheses, lowest sufficient fidelity, whole-team design, sprint research, outcome metrics, Agile integration and recent invalidation."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A quick diagnostic review of a Lean UX practice.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L191-L205"
status: active
revision: 1
---

# Run the Lean UX diagnostic

Audit assumptions, testable hypotheses, lowest sufficient fidelity, whole-team design, sprint research, outcome metrics, Agile integration, recently invalidated hypothesis; apply listed fixes.
<!-- vpmodule:atom:end lean-ux-diagnostic -->
<!-- vpmodule:atom:begin lean-ux-embedded-research -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-embedded-research
title: Embed lightweight research every sprint
summary: "Recruit, test and synthesize regularly, have the team observe, replace proto-personas with evidence, and obtain consent."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A product team runs discovery alongside delivery.
conditions_does_not_apply_when: A one-off research study outside the product cycle.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Research happens every sprint, the team observes, and personas are evidence-based."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L129-L151"
status: active
revision: 1
---

# Embed lightweight research every sprint

Embed lightweight research each sprint; recruit/test/synthesize regularly, have team observe, replace proto-personas with evidence-based personas, obtain consent and allow withdrawal.
<!-- vpmodule:atom:end lean-ux-embedded-research -->
<!-- vpmodule:atom:begin lean-ux-hypothesis-statements -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-ux-hypothesis-statements
title: Write testable hypothesis statements
summary: "Name the persona, action, outcome and measurable signal, split large bets and predefine validation criteria."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Turning an assumption into a test.
conditions_does_not_apply_when: A prediction that cannot be measured or falsified.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - hypothesis
  - signal
  - criteria
artifact_contract_verified_by: The hypothesis names a measurable signal and criteria fixed before the test.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-ux/SKILL.md; sha256=4fe0a10132650ad36bc79676b12c8f58b19035a40ac6587c864387d0f808cf04; locator=skills/lean-ux/SKILL.md#L56-L79"
status: active
revision: 1
---

# Write testable hypothesis statements

Translate assumptions into testable predictions naming persona, action, outcome, measurable signal; split large bets and predefine validation criteria. Do not cherry-pick metrics afterward.
<!-- vpmodule:atom:end lean-ux-hypothesis-statements -->