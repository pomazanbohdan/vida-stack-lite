---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-cro-methodology-skill-md-0637a608-c01"
title: "wondelai-skills: skills/cro-methodology/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/cro-methodology/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/cro-methodology/SKILL.md\"}"
atom_ids:
  - cro-methodology-ab-test
  - cro-methodology-apply
  - cro-methodology-common-mistakes
  - cro-methodology-diagnostic
  - cro-methodology-evidence
  - cro-methodology-hypothesis
  - cro-methodology-objection-table
  - cro-methodology-persuasion-assets
atom_count: 8
atoms: "[{\"atom_id\":\"cro-methodology-ab-test\",\"file_sha256\":\"ead3331a27724ffb25887dde94f2e84475b31336aefe489f74e2f35aaf24783d\",\"content_sha256\":\"6f7a9653b37908b14b25b2263d9405b15798657d2e8752d852f8939e6d14f7a1\",\"file_bytes\":1886,\"body_bytes\":669},{\"atom_id\":\"cro-methodology-apply\",\"file_sha256\":\"c391c71a40080984357fe1083526d75db971a70ac1c080addf7ae543266a8cdb\",\"content_sha256\":\"0d125fa8685ec89a643b71f6c6002611b2857e2ea4aac0a5d7948b81e32913fd\",\"file_bytes\":1364,\"body_bytes\":196},{\"atom_id\":\"cro-methodology-common-mistakes\",\"file_sha256\":\"4834840d87a183a59d7ab7c9c6abd2ead1f5d5a2fc9f56ce405a143848e33767\",\"content_sha256\":\"08f9135d6949191c14579bee304d0d07df5dbbbdf107b23679b33db9f0abdbd5\",\"file_bytes\":1762,\"body_bytes\":597},{\"atom_id\":\"cro-methodology-diagnostic\",\"file_sha256\":\"a2dcbabe1e4e6cde4b705b84f0cfcc72b6a39b14697a5a919d7553078568c4a9\",\"content_sha256\":\"c0258f224d1c187708b45d5c7ea29f23b9dde4ab084cda8e94bf145f2e79583a\",\"file_bytes\":1953,\"body_bytes\":721},{\"atom_id\":\"cro-methodology-evidence\",\"file_sha256\":\"fb480127ef90e9715c5a3cd70016b21458e56c98ad82458a82ea162839224be6\",\"content_sha256\":\"c106f133614e77d2e0542048d4f620daceee06e2777e13652fd7dc22ec1972f0\",\"file_bytes\":1404,\"body_bytes\":241},{\"atom_id\":\"cro-methodology-hypothesis\",\"file_sha256\":\"215994cb91b0129e8d373a1a80bd58b3e4d0e88a00c37229cfc351c4bb7cd606\",\"content_sha256\":\"690914bb33f3b60f4e578e35e6f73e5f2bcf3327e0935d6180aa6034f8d8523d\",\"file_bytes\":1773,\"body_bytes\":610},{\"atom_id\":\"cro-methodology-objection-table\",\"file_sha256\":\"91d987be1f0a86cffda270c5402122065ff4b6c8e4df41b767d40213752c333b\",\"content_sha256\":\"77965fc39da30d6dd9b39618467929c8fd724fee9c90359cf0c4e55f15bf87e3\",\"file_bytes\":1762,\"body_bytes\":570},{\"atom_id\":\"cro-methodology-persuasion-assets\",\"file_sha256\":\"78cad783dc493a72b06d944e55dbeedfc9e38534f7e5a378c5fba0e834124df5\",\"content_sha256\":\"e11eb686d384457867c5cb527a5d13f0459101814de8d4f35de676712eb281ae\",\"file_bytes\":1845,\"body_bytes\":626}]"
carrier_sha256: 46ce4e0aff408e7f8ea832676b6df18c0ae52ae4414e2789952b3725ee126668
carrier_bytes: 14642
revision: 1
status: active
---
<!-- vpmodule:atom:begin cro-methodology-ab-test -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-ab-test
title: Run a statistically valid A/B test
summary: "Calculate sample size from baseline, effect, 80% power and 95% significance; run a full business cycle; never peek or rerun; and report practical as well as statistical significance."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Running or reviewing an A/B or multivariate test.
conditions_does_not_apply_when: A qualitative usability observation with no control group.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Sample size and duration are set before the test, the pre-set result is reported, and an inconclusive result is not buried."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L163-L191"
status: active
revision: 1
---

# Run a statistically valid A/B test

Before an A/B test, calculate required sample size using baseline rate, minimum detectable effect, 80% power, and 95% significance. Run for at least one full business cycle (1–2 weeks), covering weekdays and weekends. Never peek and stop early. Consider practical significance as well as statistical significance; use multivariate testing only with 100,000 or more monthly visitors on a proven winning page. Promote winners to the new control, and value informative failed tests. Set sample size and duration up front, report the pre-set result, never rerun until a desired answer appears, and never bury an inconclusive result.
<!-- vpmodule:atom:end cro-methodology-ab-test -->
<!-- vpmodule:atom:begin cro-methodology-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-apply
title: Apply evidence-led conversion optimization
summary: Optimize conversion by understanding why visitors do not convert and by basing changes on customer evidence rather than competitor copying or generic advice.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: "Improving a landing page, funnel or conversion flow."
conditions_does_not_apply_when: A purely brand-awareness page with no conversion action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The work names the visitor reason it addresses and the customer evidence behind it.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply evidence-led conversion optimization

Optimize conversion by understanding why visitors do not convert; base changes on customer evidence rather than competitor copying or generic advice.
<!-- vpmodule:atom:end cro-methodology-apply -->
<!-- vpmodule:atom:begin cro-methodology-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-common-mistakes
title: Avoid the listed CRO mistakes
summary: "Avoid blind copying, superficial tests, assumed motives, best practices as rules, HiPPO decisions, missing funnel context, meek tweaks and abandoning after one failure, and apply each fix."
capability_tags:
  - verify-work-results
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a conversion program for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L192-L204"
status: active
revision: 1
---

# Avoid the listed CRO mistakes

Avoid copying competitors blindly, testing superficial changes before understanding objections, assuming visitor motives, applying unvalidated best practices as rules, making HiPPO decisions, optimizing without funnel context, choosing meek tweaks over bold changes, or abandoning the opportunity after one failed test. Research your visitors, treat practices as hypotheses, let research and test results guide decisions, map the funnel, test changes capable of substantial impact, and investigate failures before returning to research and trying a bolder change.
<!-- vpmodule:atom:end cro-methodology-common-mistakes -->
<!-- vpmodule:atom:begin cro-methodology-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-diagnostic
title: Run the CRO diagnostic
summary: "Check one action, research, objection table, five-second value proposition, visible proof, funnel mapping and UX blockers, and apply the matching action for each failed check."
capability_tags:
  - verify-work-results
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a landing page or conversion flow.
conditions_does_not_apply_when: A full CRO audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each diagnostic question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L205-L218"
status: active
revision: 1
---

# Run the CRO diagnostic

Audit a landing page or conversion flow against the seven questions: whether visitors have one action, research explains non-conversion, an O/CO table exists, the value proposition is clear within five seconds, persuasion assets are visible, the funnel has been mapped for blocked arteries, and the path is free of UX blockers. For each no, apply the listed action: set one goal and remove competing CTAs; research via surveys and logs; build a researched O/CO table and place counters at friction; run a five-second test and rewrite in customer language; audit/acquire/display proof; map stage traffic, compare benchmarks and prioritize; fix load time, mobile layout and over-long forms first.
<!-- vpmodule:atom:end cro-methodology-diagnostic -->
<!-- vpmodule:atom:begin cro-methodology-evidence -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-evidence
title: Research why visitors fail to convert
summary: Do not guess or copy competitors; discover visitor reasons through research and remove barriers systematically with evidence and proof.
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Diagnosing a conversion problem before changing a page.
conditions_does_not_apply_when: A page with no traffic or conversion data yet.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each proposed barrier is supported by visitor evidence, not by a competitor example or a best-practice claim."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L14-L17"
status: active
revision: 1
---

# Research why visitors fail to convert

Do not guess at why visitors fail to convert or copy competitors and generic best practices; discover visitor reasons through research, then eliminate barriers systematically with evidence and proof.
<!-- vpmodule:atom:end cro-methodology-evidence -->
<!-- vpmodule:atom:begin cro-methodology-hypothesis -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-hypothesis
title: Write a testable conversion hypothesis
summary: "State the change, expected metric improvement and research reason; set primary, secondary and guardrail metrics; score ICE; and record the result and next steps."
capability_tags:
  - design-experiments
pattern_tags:
  - experiment-design
conditions_applies_when: Designing a conversion experiment.
conditions_does_not_apply_when: A change that cannot be measured.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The hypothesis states change, expected effect, reason, metrics and ICE score before the test, and records the result after."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L143-L162"
status: active
revision: 1
---

# Write a testable conversion hypothesis

Document each experiment hypothesis as a specific change, expected metric improvement, and research-based reason. Set primary, secondary, and guardrail metrics before testing. Score Impact, Confidence, and Ease from 1–10 and prioritize by their average. Deprioritize changes that could not produce a 10x result; the section's examples distinguish major offer/value changes from minor cosmetic tweaks. Before testing, document the hypothesis, primary metric, sample size, and duration; afterward, document raw numbers, confidence interval, learnings, and next steps.
<!-- vpmodule:atom:end cro-methodology-hypothesis -->
<!-- vpmodule:atom:begin cro-methodology-objection-table -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-objection-table
title: Build an objection and counter-objection table
summary: "Map each researched objection to a specific evidence-backed counter, place counters at the friction point, and do not state implicit objections the visitor will not admit."
capability_tags:
  - assemble-persuasion-proof
pattern_tags:
  - objection-handling
conditions_applies_when: Preparing page copy or sales responses for known objections.
conditions_does_not_apply_when: A page with no identified objection.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every objection has a researched, evidence-backed counter placed where the objection occurs."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L111-L142"
status: active
revision: 1
---

# Build an objection and counter-objection table

Build an Objection/Counter-Objection table from researched visitor objections, mapping each objection to a specific evidence-backed counter. For implicit objections visitors will not admit, use a counter only without stating the objection. Put counters at the friction point, address primary objections above the fold, and repeat a counter in multiple formats. Canned support responses can supply tested counters. A counter must resolve a concern with real evidence and must not dismiss a legitimate worry as unfounded.
<!-- vpmodule:atom:end cro-methodology-objection-table -->
<!-- vpmodule:atom:begin cro-methodology-persuasion-assets -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-persuasion-assets
title: Inventory and present genuine persuasion assets
summary: "Inventory credentials, social proof, risk reversal, data and process assets, acquire missing ones, present claim-proof-reinforcement at friction points, and never fabricate proof."
capability_tags:
  - assemble-persuasion-proof
pattern_tags:
  - proof-inventory
conditions_applies_when: Writing a page or offer that needs proof.
conditions_does_not_apply_when: A page with no claim that needs substantiation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each claim has a real, verifiable proof asset placed at the friction point, and no testimonial or statistic is invented."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L81-L110"
status: active
revision: 1
---

# Inventory and present genuine persuasion assets

Inventory persuasion assets across credentials and authority, social proof, risk reversal, data and specificity, and process and methodology; create a wish list and actively acquire missing assets. Present proof as claim, proof, then reinforcement. Prefer contextualized specific results, named testimonials with photos, case studies, statistics, logos, then generic testimonials; place proof at friction points and prefer specific numbers to rounded ones. Never fabricate testimonials, inflate statistics, or display fake trust badges; proof must be genuine and verifiable.
<!-- vpmodule:atom:end cro-methodology-persuasion-assets -->