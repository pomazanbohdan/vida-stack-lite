---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-create-business-skill-md-6b5307d0-c01"
title: "wondelai-skills: skills/create-business/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/create-business/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/create-business/SKILL.md\"}"
atom_ids:
  - create-business-apply
  - create-business-beachhead
  - create-business-blue-ocean
  - create-business-common-mistakes
  - create-business-complete
  - create-business-core
  - create-business-design-sprint
  - create-business-intake
atom_count: 8
atoms: "[{\"atom_id\":\"create-business-apply\",\"file_sha256\":\"b49e40ec65f385bfd1d1fb569ce9cbf8b50c0874df879828235d6fc0b1fcac77\",\"content_sha256\":\"e8deb37c1e6be46c0b8fbbeabd57dc3507a2e1f2e090bcbddafe7d4e59ee2847\",\"file_bytes\":1560,\"body_bytes\":343},{\"atom_id\":\"create-business-beachhead\",\"file_sha256\":\"9e5f2cc83e66b39b2e13ad4ab4e2b12536594171d3c93f876d4f4b3cfa8f6950\",\"content_sha256\":\"c7b50aa94ca8455b66c39bed0c1d2f77fde478528af21ba91c4f7c89a4e99915\",\"file_bytes\":2183,\"body_bytes\":1012},{\"atom_id\":\"create-business-blue-ocean\",\"file_sha256\":\"62aab9a170ebb91ef45488a74a99fc9a359f8a00c50881a4d108e1c98dadc43d\",\"content_sha256\":\"be08196322b400ef0aa8eaf4bc74fbd8802633117daff49da8ad78acc1632d2e\",\"file_bytes\":2014,\"body_bytes\":850},{\"atom_id\":\"create-business-common-mistakes\",\"file_sha256\":\"0c4c1618cabaa316eca96934fd128e2c6e3546fcb9220c4f57cf6e21a3d89f30\",\"content_sha256\":\"270a44b3dd094eefa582e189af1eef8de62fd1cba3ed3e9e7e1a2c1dec6348c5\",\"file_bytes\":1936,\"body_bytes\":737},{\"atom_id\":\"create-business-complete\",\"file_sha256\":\"52fb89ba500d7d3156dca4227b0452648db7a45ed9009bab40cc261a650c9acc\",\"content_sha256\":\"1e710c7142d3288b1838daa3ecb7bd43d174ca623d2271ec02219b96c66385ab\",\"file_bytes\":1969,\"body_bytes\":741},{\"atom_id\":\"create-business-core\",\"file_sha256\":\"166934e1e560ab723b79017f6da43707d6af7a73b5ac402707bbfbcb632056ad\",\"content_sha256\":\"5aede31720c7333e61614e46b0ee6807a99ecb31ddf08b73d6613ccbd54eda02\",\"file_bytes\":1504,\"body_bytes\":334},{\"atom_id\":\"create-business-design-sprint\",\"file_sha256\":\"79989eec152720b4cdafb545537cfbace7446e683f88afc6eb8f0c7d22f130f9\",\"content_sha256\":\"0655d37a1b1a1451dddb5d4659c1e030043ec63f66c0acfd13881f49ed1130c1\",\"file_bytes\":2424,\"body_bytes\":1215},{\"atom_id\":\"create-business-intake\",\"file_sha256\":\"e3d34aac16b24ad68a59d960321b10f73f7ec544417dccccbeaf2f2c5410fdd2\",\"content_sha256\":\"67e709393df9a94d27ce27bb910a9ace776b5bf5a1398f20675e33b94cbfe627\",\"file_bytes\":2345,\"body_bytes\":1151}]"
carrier_sha256: ce9a6e8a0d6be82c1f5665dc5c3c386f2f0b21a5c872256c301cb9f9f6597d2a
carrier_bytes: 16794
revision: 1
status: active
---
<!-- vpmodule:atom:begin create-business-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-apply
title: Run the business-creation journey
summary: "Guide a raw idea through ten sequential validation phases that may loop back; ask before every decision, record decisions in docs so the journey resumes, and keep demand before building, strategy before scale and price before product."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
conditions_applies_when: A raw business idea with no paying customers.
conditions_does_not_apply_when: An established business with paying customers.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The journey names the phases, their order and the artifacts that record each decision."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L10-L13"
status: active
revision: 1
---

# Run the business-creation journey

Guide a raw idea through ten sequential business-validation phases that may loop back as evidence accumulates. The agent asks before every decision and records decisions in docs so the journey can resume. Keep the order: establish demand before building, strategy before scaling, and price before product.
<!-- vpmodule:atom:end create-business-apply -->
<!-- vpmodule:atom:begin create-business-beachhead -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-beachhead
title: Choose the beachhead
summary: "Pick one narrow segment with urgent expensive pain, reachable channels and connected customers; assemble the whole product for pragmatists, use references and shift positioning from revolutionary to proven."
capability_tags:
  - build-validated-business
pattern_tags:
  - beachhead-segment
conditions_applies_when: Crossing from visionaries to pragmatists.
conditions_does_not_apply_when: A strategy that pursues several segments at once.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: One beachhead is scored and every whole-product gap has an owner and priority.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L186-L199"
status: active
revision: 1
---

# Choose the beachhead

Choose one narrow beachhead and assemble the whole product needed to move from visionary early adopters to pragmatist early majority; recognize that what wins one group may repel the other. Select a segment with urgent, expensive pain, reachable channels, connected customers, and scope small enough to own but large enough to matter. Include required integrations, onboarding, support, and partners. Use references as currency and shift positioning from revolutionary to proven. Invoke crossing-the-chasm with POSITIONING.md and STRATEGY.md; score niches for pain, reachability, word-of-mouth, and dominability and map pragmatist whole-product needs. Ask the user for one beachhead and recommend the highest-scoring niche small enough to dominate; resist pursuing several. Extend STRATEGY.md with Beachhead and Whole-Product Checklist, assigning each gap an owner and priority; update tracker. Done when the chosen beachhead is scored and every whole-product gap has owner and priority.
<!-- vpmodule:atom:end create-business-beachhead -->
<!-- vpmodule:atom:begin create-business-blue-ocean -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-blue-ocean
title: Find uncontested space
summary: "Pursue differentiation and low cost together with an Eliminate/Reduce/Raise/Create grid and a divergent strategy canvas; convert soon-to-be, refusing or unexplored non-customers without cutting trust, security or accuracy."
capability_tags:
  - build-validated-business
pattern_tags:
  - blue-ocean-err
conditions_applies_when: Choosing where to compete.
conditions_does_not_apply_when: Head-on competition on identical factors.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The ERRC grid and canvas are filled and the target non-customer tier is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L130-L143"
status: active
revision: 1
---

# Find uncontested space

Choose uncontested space through value innovation that pursues differentiation and low cost together. Use an Eliminate/Reduce/Raise/Create grid and a strategy canvas that shows divergence from the industry's curve. Convert soon-to-be, refusing, or unexplored non-customers rather than rivals' customers by identifying a common barrier; do not eliminate factors customers genuinely value, including trust, security, and accuracy. Invoke blue-ocean-strategy with CUSTOMER.md alternatives and STRATEGY.md kernel; build the canvas and an ERRC move within resource limits. Ask which factors to change and which non-customer tier to convert; confirm protected factors are not cut. Extend STRATEGY.md with Strategy Canvas & ERRC Grid; update tracker. Done when the grid and divergent canvas are filled and target tier is selected.
<!-- vpmodule:atom:end create-business-blue-ocean -->
<!-- vpmodule:atom:begin create-business-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-common-mistakes
title: Avoid the listed business-creation mistakes
summary: "Avoid building before validating, pitching during discovery, mistaking compliments or signups for validation, confusing goals for strategy, positioning for everyone and pricing on cost or competitors; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a business-creation effort for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L213-L223"
status: active
revision: 1
---

# Avoid the listed business-creation mistakes

Avoid building before validation: use the smallest evidence-buying MVP, such as smoke test or concierge, before real code and run Phases 1–4 first. During discovery, discuss customers' lives and past behavior, not a pitch; save the idea for the end if at all. Do not treat compliments or signups as validation; seek commitments such as deposits, pre-orders, or scheduled pilots and record them in CUSTOMER.md Interview Evidence. Diagnose the single critical challenge before writing strategy and audit against the four bad-strategy hallmarks. Narrow best-fit positioning repeatedly, and base pricing on validated willingness-to-pay ranges with the price metric chosen before price level.
<!-- vpmodule:atom:end create-business-common-mistakes -->
<!-- vpmodule:atom:begin create-business-complete -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-complete
title: Close the journey
summary: "Verify each artifact: validated job and 5+ evidence rows, tested riskiest assumption, strategy kernel, ERRC grid and beachhead, 30-second positioning and a priced offer with WTP evidence; close only when every phase is done or skipped with reason and route to grow-business or create-app."
capability_tags:
  - build-validated-business
pattern_tags:
  - business-creation-sequence
conditions_applies_when: Closing a business-creation journey.
conditions_does_not_apply_when: A journey still in discovery.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every exit-check item is tied to an artifact and the next route is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L224-L235"
status: active
revision: 1
---

# Close the journey

Before closing the journey, verify each required artifact: CUSTOMER.md has a validated job and at least five evidence rows with real commitments; EXPERIMENTS.md records the riskiest assumption tested and verdict; STRATEGY.md has the kernel, no-list, ERRC grid, chosen beachhead, and whole-product checklist; POSITIONING.md one-liner passes the 30-second outsider test; OFFER.md contains a priced Grand Slam offer backed by WTP evidence and a price metric. Close the tracker only when every phase is done or skipped with reason; carry open Next Actions into relevant artifacts. Once the beachhead is chosen and first customers pay, route to grow-business; when a validated idea needs software built, route to create-app.
<!-- vpmodule:atom:end create-business-complete -->
<!-- vpmodule:atom:begin create-business-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-core
title: Earn evidence before spending runway
summary: "Prioritize demand before building, strategy before scale and price before product; sequence phases, ask at every decision and invoke constituent skills instead of improvising their frameworks."
capability_tags:
  - build-validated-business
pattern_tags:
  - business-creation-sequence
conditions_applies_when: Sequencing a new-business validation effort.
conditions_does_not_apply_when: An existing business seeking incremental growth.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan follows the stated order and each phase uses its named method.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L14-L17"
status: active
revision: 1
---

# Earn evidence before spending runway

Earn evidence before spending runway: prioritize demand before building, strategy before scale, and price before product. Sequence phases, ask at every decision point, record the user's decisions in docs, and invoke constituent skills for their methods instead of improvising those frameworks.
<!-- vpmodule:atom:end create-business-core -->
<!-- vpmodule:atom:begin create-business-design-sprint -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-design-sprint
title: Test the riskiest assumption in five days
summary: "Run Map, Sketch, Decide, Prototype and Test in one week with exactly five target customers; build a facade, appoint one Decider, do not explain the prototype and record the verdict and next choice."
capability_tags:
  - build-validated-business
pattern_tags:
  - design-sprint-test
conditions_applies_when: Testing the riskiest part of a concept before building.
conditions_does_not_apply_when: A concept already tested with five or more target users.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The sprint card records five sessions, a verdict and build, fix or walk away."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L88-L101"
status: active
revision: 1
---

# Test the riskiest assumption in five days

Test the concept's riskiest assumption in one week with five real customer reactions before committing months. Run five days: Map, Sketch, Decide, Prototype, Test; choose one riskiest target moment, sketch alone without group brainstorming, appoint one Decider to break ties, build a facade rather than working code, and test with exactly five target customers. On Friday, do not explain the prototype; let customers struggle because explanation invalidates the test. Invoke design-sprint with the validated job and open question; prepare the Monday map and target moment plus a Friday five-act interview script that does not explain the prototype. Give the recruiting brief to the user, pause awaiting-evidence for real sessions, and retain approved script and brief under the sprint card in EXPERIMENTS.md. Ask which single assumption to test and who is Decider; on return ask whether to build, fix, or walk away. Create EXPERIMENTS.md with Experiment Cards (EXP-001, sprint type, precommitted metric, decision rule, result, verdict) and Experiment Backlog; update tracker. Done when the card has the verdict from five sessions and the user chose build/fix/walk away.
<!-- vpmodule:atom:end create-business-design-sprint -->
<!-- vpmodule:atom:begin create-business-intake -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-intake
title: Run intake before creating the tracker
summary: "Ask the unanswered intake questions about idea, customer, access, evidence, business model, runway and existing product; apply the stated skip and defer rules; then create and confirm the tracker."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
conditions_applies_when: First run with no business-creation tracker.
conditions_does_not_apply_when: A resumed journey that already has a tracker.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every intake question is answered, the skip/defer rules are applied and the tracker is confirmed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L44-L57"
status: active
revision: 1
---

# Run intake before creating the tracker

Before creating the tracker, ask any unanswered Intake questions: the raw idea; intended customer and current solution; customer access; existing evidence such as interviews, waitlist, sales, or prototype; B2B/B2C and, for B2B, sales-led/self-serve plus marketplace/network status; runway and deadline; and whether a product is already built. Use the answers to shape job reconstruction, competing alternatives, phases 2–4 access, discovery fast-tracking, optional skill routing, phase depth, and whether grow-business or improve-business is the better route. Skip Phase 1 only if CUSTOMER.md already contains a validated job statement with all three dimensions. Skip Phase 3 only if a working prototype has already been tested with at least five target users. Defer Phase 6 for a clearly differentiated niche until the kernel is set. Defer Phases 5–10 until Phase 2 returns real commitments; do not do strategy on unvalidated demand. Then create CREATE-BUSINESS-PLAN.md from the template, status every phase, and confirm the plan; completion requires the file, all phase statuses, and user confirmation.
<!-- vpmodule:atom:end create-business-intake -->