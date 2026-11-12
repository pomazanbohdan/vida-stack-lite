---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-grow-app-skill-md-6cf16805-c02"
title: "wondelai-skills: skills/grow-app/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/grow-app/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/grow-app/SKILL.md\"}"
atom_ids:
  - grow-app-intake
  - grow-app-journey-map
  - grow-app-metrics
  - grow-app-microinteractions
  - grow-app-motivation
  - grow-app-operating-rules
  - grow-app-optional-phases
  - grow-app-team
atom_count: 8
atoms: "[{\"atom_id\":\"grow-app-intake\",\"file_sha256\":\"f614c3271aa125ed5ec1ad7e79bca965d8292996c1357996f468bf18fea60cd1\",\"content_sha256\":\"7243c2ec546b9edbb0460ca5968fb84a25d5d81e2c10816546ebf7c85d0ac9f1\",\"file_bytes\":2240,\"body_bytes\":1060},{\"atom_id\":\"grow-app-journey-map\",\"file_sha256\":\"a61483acbe4c99327423040dda954c65529ebef3312065294029847e0d47a255\",\"content_sha256\":\"57b76f1bc5d0384b2bb0eeec06a4f3421657298d2b6ef0f7b3256edc41d29eb9\",\"file_bytes\":1856,\"body_bytes\":703},{\"atom_id\":\"grow-app-metrics\",\"file_sha256\":\"40fd130be0e390e11efcbeed97f67b3b205e51801cb6a77bd79f000970040499\",\"content_sha256\":\"d48238a9db1627934c58109bb397bf839cb4142ce58f0ef84091e71eef48c631\",\"file_bytes\":2221,\"body_bytes\":1006},{\"atom_id\":\"grow-app-microinteractions\",\"file_sha256\":\"b69892f65bcd7de397c29ceb1eb42a7faf6531aeda7f7ffc4ea2edb80fc609fe\",\"content_sha256\":\"7b5da90fddf8eb0ab4c7565a887169065f294af1c85dd81c22a8ae62129ab653\",\"file_bytes\":2071,\"body_bytes\":850},{\"atom_id\":\"grow-app-motivation\",\"file_sha256\":\"fed8d1ce1db1956c227f3af6b98947a4a90b0669d8fb5f414c9690defb1f4124\",\"content_sha256\":\"c416b0d7cad090d03ad917334cd364adfd7929c2ab1fd5110881e3624a05e624\",\"file_bytes\":2321,\"body_bytes\":1090},{\"atom_id\":\"grow-app-operating-rules\",\"file_sha256\":\"c11eb17853ecbe1abcd5b20fb3d85e21f229c64a5c8aa564c4489d47d0f66ad5\",\"content_sha256\":\"0122b2438fd121089f3891a463a95eb0a9afdb3f3385447c827bc4f1219d2db0\",\"file_bytes\":3192,\"body_bytes\":1956},{\"atom_id\":\"grow-app-optional-phases\",\"file_sha256\":\"01f30add5c05c8c009754b5606f69863e894b89974e92c7c5e5cd847e8ec55fd\",\"content_sha256\":\"96681da2d6b9c398fd7680e06c11e19a0b3b80d44f84eb30df10123a8af85b97\",\"file_bytes\":1957,\"body_bytes\":757},{\"atom_id\":\"grow-app-team\",\"file_sha256\":\"a43936a271b5a771a0e308ab8928561b3189b45560f5d6bd9d0990dbd0b7fdc1\",\"content_sha256\":\"302d18ba4485a3fde97ee63481616bc77400f2956fead94aca7d3a56337aff71\",\"file_bytes\":2039,\"body_bytes\":857}]"
carrier_sha256: 687d8ce52011c7470eb1e60ea6e2fe0fbad538c2b286d01e12b644705f57e7a0
carrier_bytes: 18674
revision: 1
status: active
---
<!-- vpmodule:atom:begin grow-app-intake -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-intake
title: Run intake before the tracker
summary: "Ask about the app and its repeated action, day-1/7/30 retention, activation leaks, team shape, network or revenue status, instrumentation and whether UX or performance is the cause; apply the skip/defer rules and confirm the tracker."
capability_tags:
  - design-retention-engine
pattern_tags:
  - resumable-journey
conditions_applies_when: First start with no grow-app tracker.
conditions_does_not_apply_when: A resumed journey that already has a tracker.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every intake question is answered, the route is stated and the tracker is confirmed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L44-L59"
status: active
revision: 1
---

# Run intake before the tracker

Run Intake only on the first start when no tracker exists. Ask what the app does and what retained users repeat; current day-1/7/30 or week-4 retention; activation leakage and first-run flow; team size/composition; whether it is a network or marketplace and whether engaged users fail to convert to revenue; available analytics/instrumentation; and whether broken UX or performance causes retention failure. These answers define the loop and OMTM, set the Rule 8 acquisition bar, feed lean-analytics, gate improve-retention and experiments, scale discovery and product-team methods, flag optional skills, and may route first to improve-app. Skip Phase 5 for a solo founder with no team to realign; defer Phase 7 until loop and activation clear their bars; run Phase 3 cadence in degraded mode if user access is unavailable. Then create the tracker from artifact-templates.md with every phase statused and confirm the plan. Intake is complete only when the tracker exists with all phase statuses and the user confirms the plan.
<!-- vpmodule:atom:end grow-app-intake -->
<!-- vpmodule:atom:begin grow-app-journey-map -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-journey-map
title: Use the eight-phase journey map
summary: "Map eight phases to their skills, questions and artifacts; take the lean-analytics baseline before Phase 1-2 fixes, judge habit formation by at least 5% unprompted return and keep the measurement current."
capability_tags:
  - design-retention-engine
pattern_tags: []
conditions_applies_when: Planning which phase produces which artifact.
conditions_does_not_apply_when: A request for one framework in isolation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every phase names its skill, question and artifact, and the baseline and 5% rule are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L18-L32"
status: active
revision: 1
---

# Use the eight-phase journey map

The journey maps eight phases to their skills, questions, and artifacts: hooked-ux to PRODUCT.md; improve-retention to PRODUCT.md; continuous-discovery to PRODUCT.md and CUSTOMER.md; lean-ux to EXPERIMENTS.md; inspired-product to PRODUCT.md; lean-analytics to METRICS.md and the Rule 8 bar; microinteractions to DESIGN.md; and drive-motivation to PRODUCT.md. Phases 1–2 address the loop and funnel, 3–5 use evidence, 6 supplies measurement, and 7–8 finish and protect the design. Establish the lean-analytics baseline before Phase 1–2 changes and keep updating it. Judge Phase 1 habit formation by at least 5% of users returning unprompted, not by one cohort.
<!-- vpmodule:atom:end grow-app-journey-map -->
<!-- vpmodule:atom:begin grow-app-metrics -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-metrics
title: Measure the one number
summary: "Choose a comparative ratio OMTM, use the Empathy, Stickiness, Virality, Revenue, Scale order, keep retention as the OMTM while weak, pair it with a counter-metric and a target line, and keep the dashboard to at most six supporting metrics."
capability_tags:
  - design-retention-engine
pattern_tags:
  - one-metric
  - stickiness-stage
conditions_applies_when: "Choosing the app's operating metric."
conditions_does_not_apply_when: A model or stage that makes another metric primary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The OMTM, counter-metric, target line, cohort baselines and retired vanity metrics are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L148-L164"
status: active
revision: 1
---

# Measure the one number

Select an OMTM that is comparative, a ratio or rate rather than a cumulative total, and changes behavior. Let business model determine relevant metrics and use this stage order: Empathy, Stickiness, Virality, Revenue, Scale. When retention is weak, use Stickiness-stage retention as the OMTM; working a later stage first is the canonical mistake. Define a target, date, and precommitted response to missing it, pair the OMTM with a counter-metric, and cohort the data. Review current dashboard and business model; flag vanity measures; specify a one-screen dashboard with the OMTM prominent and no more than six supporting metrics, plus a cohorted retention view. With the user, choose the OMTM, counter-metric, target/date/miss response, and vanity metrics to retire. Create METRICS.md with stage/OMTM, KPI definitions, baselines/targets, funnel, and cohort notes; update the tracker. Completion requires these records, the dashboard specification, and the Rule 8 retention bar.
<!-- vpmodule:atom:end grow-app-metrics -->
<!-- vpmodule:atom:begin grow-app-microinteractions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-microinteractions
title: Polish the micro-moments
summary: "Model Trigger, Rules, Feedback and Loops for each frequent interaction; keep feedback under 100ms for direct manipulation, map empty, loading, partial, error, disabled and double-tap states and ship one signature moment that passes the removal test."
capability_tags:
  - design-retention-engine
pattern_tags:
  - microinteraction-feedback
conditions_applies_when: Polishing the most-used interactions.
conditions_does_not_apply_when: A screen with no repeated interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Five interactions have missing states and fixes, and the signature moment is chosen and implemented."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L165-L181"
status: active
revision: 1
---

# Polish the micro-moments

For each microinteraction, model Trigger → Rules → Feedback → Loops & Modes. Feedback must be immediate, under 100 ms for direct manipulation, and proportionate; animate the touched element rather than using a separate toast. Map empty, loading, partial, error, disabled and double-tap states. Invest in one or two signature moments that pass the removal test, and use long loops to retire hints for power users. Audit the five most-used interactions, identify missing edge states and implement one signature moment in real code. Ask the user which five to audit, which becomes signature and which edge states to implement first. Record inventory, fixes and statuses in DESIGN.md and update tracker. Done when five interactions, missing states/fixes and chosen signature moment are recorded and each fix has status.
<!-- vpmodule:atom:end grow-app-microinteractions -->
<!-- vpmodule:atom:begin grow-app-motivation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-motivation
title: Sustain intrinsic motivation
summary: "Support autonomy, mastery and purpose; treat if-then rewards as harmful for cognitive tasks, remove forced tutorials and mandatory notifications, convert if-then rewards to now-that recognition and change streaks or points that exploit loss aversion."
capability_tags:
  - design-retention-engine
pattern_tags:
  - intrinsic-motivation
  - manipulation-matrix
conditions_applies_when: "Auditing gamification, streaks, points or notifications."
conditions_does_not_apply_when: A product with no engagement mechanics.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The AMP score and every autonomy violation are recorded with owned fixes.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L182-L198"
status: active
revision: 1
---

# Sustain intrinsic motivation

Sustain engagement through Autonomy, Mastery, and Purpose rather than exploitation. For tasks requiring cognitive effort, ‘if-then’ rewards reduce intrinsic motivation. Support autonomy through choice over what, when, how, and with whom; mastery through visible progress and flow-calibrated challenge; and purpose through a meaningful why. Treat forced tutorials, unskippable steps, and mandatory notifications as autonomy killers. Reserve rewards for meaningful milestones and prefer ‘now-that’ recognition over ‘if-then’ bargains. Audit gamification, streaks, points, and notifications for AMP scores, autonomy violations, the point where streaks become loss aversion, and redesign around real mastery and purpose. With the user, choose violations to remove, rewards to convert, and streak/point mechanics to change if they exploit loss aversion. Record AMP audit rows with fix, owner, and status in PRODUCT.md. Completion requires AMP score and violations recorded, owned reward/streak fixes, and loops passing the Rule 8 Manipulation Matrix.
<!-- vpmodule:atom:end grow-app-motivation -->
<!-- vpmodule:atom:begin grow-app-operating-rules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker; intake on first run; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; keep acquisition phases locked and check every loop against the Manipulation Matrix."
capability_tags:
  - design-retention-engine
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any grow-app phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and the tracker records every phase transition.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L33-L43"
status: active
revision: 1
---

# Apply the operating rules

Apply these operating rules: resume first by reading the tracker and all mapped artifacts; if a tracker exists, summarize state in 3–5 lines, ask which phase to enter, and resume rather than restart, ending intake when the user confirms an entry point. Without a tracker, run intake, create GROW-APP-PLAN.md with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and get confirmation of the phase plan. On phase entry, state its purpose, forced decision, artifact and rough effort; offer proceed/skip/defer, except GATE phases may be deferred but never skipped; mark in-progress on proceed and finish entry when the user chooses. Load and use the named phase skill; if unavailable, offer the specified install command, and if declined use the Brief's minimum viable method and state the mode. Ask every listed in-phase question with concrete options and a recommendation; record choices in Key Decisions. Present draft artifacts for sign-off before writing; after approval, write or extend docs, update tracker status, Key Decisions and Next Actions, and finish when files are written and phase is done. Read before writing; create only missing docs files, otherwise extend and preserve others' content. Use uppercase filenames and, on first creation, the complete artifact-template skeleton with named sections filled. Every recommendation is a checkbox or table row with owner and priority. Keep acquisition phases (optional cold-start-problem, contagious, crossing-the-chasm and any paid-growth work) locked while activation and retention are below the bar set at intake; unlock only when the cohort curve clears that bar. Every habit loop and reward must pass the Manipulation Matrix: build only what the maker would use and honestly believes materially improves users; replace tactics needing manufactured anxiety or loss aversion with real-value tactics.
<!-- vpmodule:atom:end grow-app-operating-rules -->
<!-- vpmodule:atom:begin grow-app-optional-phases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-optional-phases
title: Add optional phases when their condition appears
summary: "Add cold-start-problem, monetizing-innovation, contagious, crossing-the-chasm or jobs-to-be-done when its stated condition first becomes true; keep acquisition-leaning phases locked behind the retention bar."
capability_tags:
  - design-retention-engine
pattern_tags: []
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The optional phase is inserted at its condition, and acquisition phases stay locked until the bar clears."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L199-L210"
status: active
revision: 1
---

# Add optional phases when their condition appears

Optional skills and their add-when conditions/artifacts are: cold-start-problem for a network or marketplace app (PRODUCT.md); monetizing-innovation when engaged users do not convert to revenue (OFFER.md); contagious when users love the app but do not mention it (MARKETING.md); crossing-the-chasm when growth stalls at the early-adopter boundary (STRATEGY.md); and jobs-to-be-done when usage suggests the app is hired for another job (CUSTOMER.md). Follow the same operating rules as core phases, load and use each listed skill, and insert it when its add-when condition first becomes true. Keep cold-start-problem, contagious, and crossing-the-chasm locked behind Rule 8 until retention clears the bar.
<!-- vpmodule:atom:end grow-app-optional-phases -->
<!-- vpmodule:atom:begin grow-app-team -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-team
title: Build with an empowered team
summary: "Give the team problems and outcome accountability, run discovery alongside delivery, expect 10-20 discovery iterations per shipped feature, assess the top three requests and reframe the roadmap as outcomes rather than dated features."
capability_tags:
  - design-retention-engine
pattern_tags:
  - empowered-product-team
conditions_applies_when: A team choosing what to build next.
conditions_does_not_apply_when: A solo founder with no team to realign.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The vision exists, each request has a build or kill verdict and roadmap rows are outcomes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L131-L147"
status: active
revision: 1
---

# Build with an empowered team

Give empowered teams problems and accountability for outcomes, not backlogs. Run discovery continuously alongside delivery to assess value, usability, feasibility and viability, and expect 10–20 discovery iterations per shipped feature. Give the team a product vision and outcome-based roadmap so it can decide autonomously. Assess the top three backlog requests for objective, target user, problem, success measure and alternatives; ask which has strongest evidence and which to kill before a sprint, establish a one-paragraph vision, and decide whether to reframe roadmap as problems and key results rather than dated features. Record vision and outcome roadmap in PRODUCT.md and update tracker. Done when vision exists, all three requests have build/kill verdicts and roadmap rows express outcomes rather than features.
<!-- vpmodule:atom:end grow-app-team -->