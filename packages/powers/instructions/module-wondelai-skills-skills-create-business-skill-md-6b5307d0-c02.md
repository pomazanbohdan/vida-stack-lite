---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-create-business-skill-md-6b5307d0-c02"
title: "wondelai-skills: skills/create-business/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/create-business/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/create-business/SKILL.md\"}"
atom_ids:
  - create-business-job
  - create-business-journey-map
  - create-business-mvp
  - create-business-offer
  - create-business-operating-rules
  - create-business-optional-phases
  - create-business-positioning
  - create-business-pricing
atom_count: 8
atoms: "[{\"atom_id\":\"create-business-job\",\"file_sha256\":\"59fb4c8d1767776631824aa8ec42c1b34f14281e410c210faafca51a2d3d6cd3\",\"content_sha256\":\"0a9aadc0e46388814f9ec82d7ae2dd5c409139e8b9064c61439b747cd690571e\",\"file_bytes\":2095,\"body_bytes\":899},{\"atom_id\":\"create-business-journey-map\",\"file_sha256\":\"c8ce206e3d1ccbfa91fe123700fc2f0f160e6757edafb1483618c62db39f0850\",\"content_sha256\":\"6ffd8775db1ec3d8583e2d5c6bc27d81a6f0388c7e4ace3c0187d099809c2865\",\"file_bytes\":2079,\"body_bytes\":942},{\"atom_id\":\"create-business-mvp\",\"file_sha256\":\"b8951b4e04138889b58bed9ceb5f8be4385d586be5b3fe8edfaf65c6b834a4ca\",\"content_sha256\":\"6fdef415b2c8dd31c3bd1694569845b9582c99b05acec83a2afa493a111771d8\",\"file_bytes\":2172,\"body_bytes\":1000},{\"atom_id\":\"create-business-offer\",\"file_sha256\":\"eb64aa4b30356cd69e0d1077f25772570bf94a45f68c54261ded1b40bf7c80f6\",\"content_sha256\":\"4200fecc38bfdc25562187c86732129f818f185549655f4f39646cce5ed098d3\",\"file_bytes\":2068,\"body_bytes\":924},{\"atom_id\":\"create-business-operating-rules\",\"file_sha256\":\"9c7472f656e031a4fd0b818df29c586545f2c94f3509634dbfe5da30444cacc9\",\"content_sha256\":\"e2363429fe0ccfd622a593737b087c903895cdef48f4b58fe8ad6fe52ac01f81\",\"file_bytes\":3099,\"body_bytes\":1836},{\"atom_id\":\"create-business-optional-phases\",\"file_sha256\":\"1896b77aed1d50fbaedfd32440e798f004ac9e71b42aac844d82a23510cc40f9\",\"content_sha256\":\"1a9e73def9f9354b30578c5eff10b55a6a7c52e3a971a8bda0bfda8c443d65a8\",\"file_bytes\":1918,\"body_bytes\":696},{\"atom_id\":\"create-business-positioning\",\"file_sha256\":\"77fbdcb45b844506c10a57af097a9fe65c8e53321c35e88c91698faac3ef71a3\",\"content_sha256\":\"cb3197d872488c7c08d302272aaa0cd0ec93efb593484b2fd982acd0fb5c2927\",\"file_bytes\":2293,\"body_bytes\":1113},{\"atom_id\":\"create-business-pricing\",\"file_sha256\":\"2495bd0ee3c1a9cdc6e698e4d8453323f19c04912540da9b72145bdffc50fac8\",\"content_sha256\":\"a320ba11fe1f6e7d620d0acdd7e1c8c9eef12d3eef4f70f82b26e373d55cdbbf\",\"file_bytes\":2379,\"body_bytes\":1168}]"
carrier_sha256: 1e63add0a791c3bf63001bdbd1d1b5f84c27e686e3520ef3f6c65f85aedeb39a
carrier_bytes: 18962
revision: 1
status: active
---
<!-- vpmodule:atom:begin create-business-job -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-job
title: Find the real job
summary: "Reframe the idea as progress a customer seeks in a situation using When/I want to/so I can; name functional, emotional and social dimensions and the full competing set including workarounds and non-consumption."
capability_tags:
  - build-validated-business
pattern_tags:
  - job-to-be-done
conditions_applies_when: Turning a raw idea into a customer job.
conditions_does_not_apply_when: A validated job statement that already has three dimensions.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The job statement is solution-agnostic, all three dimensions are named and the hire to beat is chosen."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L60-L73"
status: active
revision: 1
---

# Find the real job

Reframe the raw idea as customer progress so the business can survive a failed first solution. Define a job as contextual progress, not a goal or task, using When [situation], I want to [motivation], so I can [outcome], without embedding a solution. Identify functional, emotional, and social dimensions and include workarounds and non-consumption among competitors. Invoke jobs-to-be-done using the raw idea and customer guess; elicit the job statement, all three dimensions, and full competing alternatives. Ask the user to choose the true job and first hire to beat; recommend the tightest statement that retains an emotional or social dimension. Create CUSTOMER.md with Job Statement, Job Dimensions, and Competing Alternatives and update the tracker. Done when the statement is solution-agnostic, all dimensions and alternatives are present, and the hire to beat is named.
<!-- vpmodule:atom:end create-business-job -->
<!-- vpmodule:atom:begin create-business-journey-map -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-journey-map
title: Use the ten-phase journey map
summary: "Run the ten phases in order from jobs-to-be-done through crossing-the-chasm, each answering one question and creating or extending its named artifact; the mom-test phase is a gate."
capability_tags:
  - build-validated-business
pattern_tags: []
conditions_applies_when: Planning which phase produces which artifact.
conditions_does_not_apply_when: A request for one framework in isolation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every phase names its skill, question and target artifact, and the gate is marked."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L18-L32"
status: active
revision: 1
---

# Use the ten-phase journey map

Use the ten-phase map in its stated order: jobs-to-be-done creates CUSTOMER.md; mom-test extends CUSTOMER.md and is a gate; design-sprint creates EXPERIMENTS.md; lean-startup creates PRODUCT.md and extends EXPERIMENTS.md; good-strategy-bad-strategy creates STRATEGY.md; blue-ocean-strategy extends STRATEGY.md; obviously-awesome creates POSITIONING.md; hundred-million-offers creates OFFER.md; monetizing-innovation extends OFFER.md; crossing-the-chasm extends STRATEGY.md. The phases answer, respectively, what customer progress is hired for; whether the job is real, painful, and worth paying to solve; whether the concept survives five real customers; the smallest MVP for the riskiest assumption; the critical challenge and how to win; uncontested space; what the business is and why it matters; what makes the offer compelling; what customers pay and the price metric; and the first segment to dominate.
<!-- vpmodule:atom:end create-business-journey-map -->
<!-- vpmodule:atom:begin create-business-mvp -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-mvp
title: Pick the smallest MVP
summary: "Plan Build-Measure-Learn backward, choose a smoke test, concierge or Wizard of Oz MVP for the riskiest leap-of-faith assumption, set pivot-or-persevere thresholds in advance and choose one growth engine."
capability_tags:
  - build-validated-business
pattern_tags:
  - minimum-viable-product
conditions_applies_when: Selecting the first build after discovery.
conditions_does_not_apply_when: A build with no stated learning goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The MVP, growth engine and pre-committed thresholds are recorded and the scope is approved."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L102-L115"
status: active
revision: 1
---

# Pick the smallest MVP

Use validated learning to select the smallest MVP testing the riskiest leap-of-faith assumption. Plan Build-Measure-Learn backward from learning to a proving metric to the minimum build. Select among smoke test, concierge, or Wizard of Oz according to the assumption tested; test the riskiest first, use actionable rather than vanity metrics, set pivot/persevere criteria before running, and choose one growth engine: sticky, viral, or paid. Invoke lean-startup with the feature wish list and surviving concept; ask for the riskiest assumption, MVP type and experiment card, and advance thresholds. Ask the user to choose MVP, one growth engine, and thresholds; recommend sticky (retention above churn) before paid acquisition. Create PRODUCT.md with Vision and MVP Definition, including exclusions; extend EXPERIMENTS.md with the card and decision rule; update tracker. Done when the experiment has precommitted thresholds and chosen engine and the user approved MVP scope.
<!-- vpmodule:atom:end create-business-mvp -->
<!-- vpmodule:atom:begin create-business-offer -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-offer
title: Build the offer
summary: "Build a Grand Slam Offer on the Value Equation with a core offer, three named objection-killing bonuses, a risk-reversing guarantee, ethical scarcity and a MAGIC name; keep every value and claim true."
capability_tags:
  - build-validated-business
pattern_tags:
  - grand-slam-offer
conditions_applies_when: Turning positioning into an offer.
conditions_does_not_apply_when: An offer whose evidence cannot be made honest.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The offer stack is complete, values are honest and no evidence is invented."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L158-L171"
status: active
revision: 1
---

# Build the offer

Build a Grand Slam Offer to convert positioning into buying and make price comparison difficult. Use Value = (dream outcome × perceived likelihood) / (time delay × effort), increasing the numerator and reducing the denominator. Include a core offer, named bonuses each addressing an objection with defensible value, a risk-reversing guarantee, ethical scarcity, and a MAGIC name. Keep values honest and guarantees honorable. Invoke hundred-million-offers with POSITIONING.md and best-fit customer; request the Value Equation, three named objection-killing bonuses, guarantee, ethical scarcity, and MAGIC name. Ask the user for the dream outcome and objections; verify every dollar value and scarcity claim is true, replacing any tactic requiring invented evidence. Create OFFER.md Offer Stack and update tracker. Done when the stack is complete, values honest, guarantee real, and no evidence invented.
<!-- vpmodule:atom:end create-business-offer -->
<!-- vpmodule:atom:begin create-business-operating-rules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker before anything else; intake on first run only; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; never simulate a customer; extend without overwriting."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any business-creation phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and the tracker records every phase transition.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L33-L43"
status: active
revision: 1
---

# Apply the operating rules

On resume, first read CREATE-BUSINESS-PLAN.md and every Journey Map artifact; if a tracker exists, summarize state in 3–5 lines and ask which phase to enter. A tracked journey is resumed, never restarted; entry is complete when the user confirms the entry point. On a first run without a tracker, conduct Intake, create CREATE-BUSINESS-PLAN.md with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and obtain confirmation of the phase plan. Before phase work, announce its purpose, decision, artifact, and rough effort; offer proceed, skip, or defer, but a GATE phase may be deferred and never skipped; mark in-progress on proceed and wait for the user's choice. Load and use the named phase skill; if unavailable, offer installation via npx skills add wondelai/skills/<slug> --global, and only if declined use the Brief as the minimum viable method, stating the mode. Ask every Decide-with-the-user question with concrete options and a recommendation, and record choices in tracker Key Decisions; silent decisions are defects. Present draft artifacts for sign-off before writing; after approval, create or extend docs and update tracker status, Key Decisions, and Next Actions; a phase is done only when files are written and its row is done. Read artifacts before writing; create only if missing, otherwise extend while preserving others' content; use uppercase filenames, render recommendations as checkboxes or table rows with owner and priority, and for a first docs file use the full artifact-template skeleton before filling named sections. The agent prepares interview guides and scores transcripts, but only the human talks to customers; pause as awaiting-evidence until the user returns with notes, and never simulate a customer.
<!-- vpmodule:atom:end create-business-operating-rules -->
<!-- vpmodule:atom:begin create-business-optional-phases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-optional-phases
title: Add optional phases when their condition appears
summary: "Add storybrand-messaging, one-page-marketing, lean-analytics, cold-start-problem, predictable-revenue or continuous-discovery when its stated condition first becomes true, following the same operating rules."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The optional phase is inserted at its stated condition and produces its mapped artifact.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L200-L212"
status: active
revision: 1
---

# Add optional phases when their condition appears

Add optional phases when their stated conditions first become true: storybrand-messaging when a website or pitch needs customer-as-hero copy before launch; one-page-marketing when go-to-market planning starts before beachhead closure; lean-analytics when a live MVP needs its first metrics baseline; cold-start-problem for marketplace or network products; predictable-revenue for B2B sales-led motion; continuous-discovery post-launch for weekly discovery. Optional phases follow the same operating rules as core phases: load and use each listed skill, insert it when its Add-when condition first becomes true, and produce its mapped artifact.
<!-- vpmodule:atom:end create-business-optional-phases -->
<!-- vpmodule:atom:begin create-business-positioning -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-positioning
title: Position in thirty seconds
summary: "Set positioning as context: true alternatives, unique attributes passing the only-we test, value through the so-what test, a tight best-fit customer and an existing, subcategory or new category."
capability_tags:
  - build-validated-business
pattern_tags:
  - market-positioning
conditions_applies_when: Choosing the comparison context for a product.
conditions_does_not_apply_when: A positioning statement with no named alternative.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The five steps are complete and an outsider understands the one-liner in 30 seconds.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L144-L157"
status: active
revision: 1
---

# Position in thirty seconds

Set positioning context, not merely messaging, so customers understand product strengths relative to chosen alternatives within 30 seconds. Complete five steps: identify true alternatives (including spreadsheets or doing nothing), identify unique attributes that pass the only-we test, derive value with the so-what test, define a tight best-fit customer by title and firm traits rather than everyone, and choose an existing category, subcategory, or new category while accounting for a new category's education tax. Invoke obviously-awesome with unique attributes from STRATEGY.md and CUSTOMER.md; produce the five-step exercise and internal statement For [best-fit customer], we are the [category] that [key value]. Ask the user to choose category and customer; recommend existing/subcategory unless there is traction to spare for new. Create POSITIONING.md with Competitive Alternatives, Unique Attributes to Value Themes, Best-Fit Customer, Market Category, and One-Liner; update tracker. Done when the canvas is complete and an outsider understands the one-liner in 30 seconds.
<!-- vpmodule:atom:end create-business-positioning -->
<!-- vpmodule:atom:begin create-business-pricing -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-pricing
title: Price against willingness to pay
summary: "Test acceptable, expensive and prohibitive prices, trust only top-box purchase probability, avoid the four failures, segment by value, classify leader/filler/killer, design the middle tier first and choose the price metric before the level."
capability_tags:
  - build-validated-business
pattern_tags:
  - wtp-research
  - price-metric
conditions_applies_when: Pricing a concept before launch.
conditions_does_not_apply_when: A price fixed by contract or regulation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "WTP evidence, feature classes, tiers and a value-tracking metric are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L172-L185"
status: active
revision: 1
---

# Price against willingness to pay

Design the product around price by testing willingness to pay while it remains a concept. Ask what price is acceptable, expensive, and prohibitive; trust only top-box purchase probability. Avoid feature shock, minivation (near-100% win rate without pushback), hidden gem, and undead. Segment by value and willingness to pay, never demographics. Classify features as leader/filler/killer, design the middle tier first, move killer features into add-ons, and choose price metric before price level. Invoke monetizing-innovation with OFFER.md and CUSTOMER.md segments; create a WTP interview script, feature classification, good/better/best tiers, and metric. Give the script to the user and pause awaiting-evidence for real calls; record the approved script under OFFER.md Willingness-to-Pay Evidence / WTP Interview Script. Ask the user for metric and tier boundaries; recommend a metric tracking delivered value. Extend OFFER.md with WTP Evidence, Leader/Filler/Killer Features, Tiers, and Price Metric; update tracker. Done when WTP evidence, classes, tiers designed from the middle, and a metric chosen before level are recorded.
<!-- vpmodule:atom:end create-business-pricing -->