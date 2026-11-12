---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-conversion-optimization-skill-md-1d88f81d-c02"
title: "wondelai-skills: skills/conversion-optimization/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/conversion-optimization/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/conversion-optimization/SKILL.md\"}"
atom_ids:
  - conversion-optimization-journey-map
  - conversion-optimization-message
  - conversion-optimization-offer
  - conversion-optimization-operating-rules
  - conversion-optimization-optional-phases
  - conversion-optimization-phases
  - conversion-optimization-proof
  - conversion-optimization-research
atom_count: 8
atoms: "[{\"atom_id\":\"conversion-optimization-journey-map\",\"file_sha256\":\"e300e898b2dab735936ed6bd3a519113a894ebf24c59110f1225aea378aca376\",\"content_sha256\":\"f532474552e686c1689e8a910d869bfe76d74510196e846a4af6a8f6e9d7ea00\",\"file_bytes\":1890,\"body_bytes\":753},{\"atom_id\":\"conversion-optimization-message\",\"file_sha256\":\"5e99bf87a4e510dfc168155ff83a2d127f68d6258b5684589fe126e445e39542\",\"content_sha256\":\"e7111a48eb12cd7e34899239009baf3c38522a13188d4f0b56d37983ca499d20\",\"file_bytes\":2376,\"body_bytes\":1135},{\"atom_id\":\"conversion-optimization-offer\",\"file_sha256\":\"9f48c90f3497230baae6d5c2ad94a56e53fa56bf8bbf4e1b6de8a269d6954ea7\",\"content_sha256\":\"eeadeb46657c314471274dd34cc9e034473eced6ad760f14cb7450214e6a8f00\",\"file_bytes\":2474,\"body_bytes\":1243},{\"atom_id\":\"conversion-optimization-operating-rules\",\"file_sha256\":\"f51710216e013f61b85ae2a188642425bbeb17e3cb14bd7e1290f41560e07f47\",\"content_sha256\":\"5695e8f523fcf1f8d38b2bf184a6978ccf4e1edbbd878fca784e6372bae4b832\",\"file_bytes\":3013,\"body_bytes\":1699},{\"atom_id\":\"conversion-optimization-optional-phases\",\"file_sha256\":\"f9df6e0c4f2c5e61d129fb20d299f4e6ce1250b4475e179d6c6d5ccbc5bae2fc\",\"content_sha256\":\"8d3cb490bd633404609b33ba2f7037eaa8ba221b9575cff1a2cc1e575e77a82e\",\"file_bytes\":2128,\"body_bytes\":839},{\"atom_id\":\"conversion-optimization-phases\",\"file_sha256\":\"e517d3a3bde32a1f7c0bf542b722fd614b9c40db0c453d045578bd63c2fd5d6f\",\"content_sha256\":\"b046e48d2ac78240a0fdf23b19d176f3580049ff45ca8615e62bcd02cfc03241\",\"file_bytes\":1709,\"body_bytes\":500},{\"atom_id\":\"conversion-optimization-proof\",\"file_sha256\":\"2d631805fdf552aa116e1ad6370c7ad350ab2d3ae11bec438629fd49f9696fd8\",\"content_sha256\":\"59f0e70acbd70b77f0c13881f2c46f69d5265f474ab438b70a7bedb3ecd692eb\",\"file_bytes\":2381,\"body_bytes\":1118},{\"atom_id\":\"conversion-optimization-research\",\"file_sha256\":\"be40580781905bfed0e80b27b5d8a8ece2d3aed9980d4251c28d7ae31fe16e73\",\"content_sha256\":\"45203ad355fc2a4bcda9065848f8ad0b82051702372ab2d8f7176422ae39b8dd\",\"file_bytes\":2736,\"body_bytes\":1434}]"
carrier_sha256: 07bd79c4431cd6a1811c0d796d5029a7d9d72a75e0d02699604fff04ca1a78f3
carrier_bytes: 19698
revision: 1
status: active
---
<!-- vpmodule:atom:begin conversion-optimization-journey-map -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-journey-map
title: Use the seven-phase journey map
summary: "Organize seven phases by skill, question and artifact: leak and one metric, researched objections, message, offer, proof, friction and pre-committed experiments."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: Planning which phase produces which artifact.
conditions_does_not_apply_when: A request for one framework in isolation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every phase names its skill, question and target artifact."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L27-L38"
status: active
revision: 1
---

# Use the seven-phase journey map

Use the journey map to organize seven phases by skill, question, and artifact: Phase 1 uses lean-analytics to locate the leak and select one metric, extending METRICS.md and gating later work; Phase 2 uses cro-methodology to research drop-off objections and friction, creating FUNNEL.md and extending EXPERIMENTS.md, and is a gate; Phases 3-6 use storybrand-messaging, hundred-million-offers, influence-psychology, and design-everyday-things to address message, offer, proof, and friction, updating the listed POSITIONING, FUNNEL, OFFER, DESIGN, and EXPERIMENTS artifacts; Phase 7 uses cro-methodology to evaluate fixes with pre-committed metrics, sample size, and no peeking, extending EXPERIMENTS.md and METRICS.md.
<!-- vpmodule:atom:end conversion-optimization-journey-map -->
<!-- vpmodule:atom:begin conversion-optimization-message -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-message
title: Fix the message at the leak
summary: "Make the leaking step state what the visitor gets, in their words, within five seconds; apply SB7, name the internal problem, use one primary CTA, retain the current copy as the before-state and log a copy test."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - message-framework
  - message-stickiness
conditions_applies_when: Rewriting the copy at the leaking step.
conditions_does_not_apply_when: Messaging already validated by another journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The rewrite passes the five-second test, names the internal problem and logs a test hypothesis."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L112-L132"
status: active
revision: 1
---

# Fix the message at the leak

At the leaking step, make clear within five seconds what the visitor gets, in the visitor's words. Apply SB7: one desired outcome, external/internal/philosophical problems, guide empathy and authority, a three-step safe plan, one Direct and one Transitional CTA, and named failure and success stakes. Use Phase 2 customer language for the headline; make it concrete and define the single Commander's Intent message to remember. Invoke storybrand-messaging using current copy, Phase 2 evidence, and POSITIONING.md if present; ask for above-the-fold rewrites naming the internal problem, a one-liner, and the two CTA types. Decide with the user which rewrite passes the five-second test, which internal problem it names, and whether to retain Transitional CTA or use one CTA. Extend POSITIONING.md Brand Script, One-Liner, and Key Messages; record proposed copy in FUNNEL.md while retaining current copy as the Phase 7 before-state; add copy tests to EXPERIMENTS.md and update tracker. Complete with a rewritten leak-step message naming the internal problem, one primary CTA, and a logged test hypothesis.
<!-- vpmodule:atom:end conversion-optimization-message -->
<!-- vpmodule:atom:begin conversion-optimization-offer -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-offer
title: Strengthen the offer
summary: "Raise dream outcome and perceived likelihood, lower delay and effort, match a guarantee to the top researched objection, stack honestly valued bonuses and use scarcity or urgency only when real."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - value-equation
  - risk-reversal
conditions_applies_when: Improving the exchange at the conversion point.
conditions_does_not_apply_when: An offer fixed by contract beyond presentation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each value lever has a change or a reason, the guarantee targets the top objection and every change has a test."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L133-L151"
status: active
revision: 1
---

# Strengthen the offer

Strengthen the exchange at the conversion point using Value = (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort & Sacrifice). Raise outcome and proof; reduce delay and effort through speed and done-for-you framing. Match a risk-reversing guarantee to the top Phase 2 objection. Stack named bonuses with honest values that each address an objection, and present price after value, anchored against the stack. Scarcity and urgency are permitted only when real. Invoke hundred-million-offers on the current offer and Phase 2 Price, Timing, and Effort objections for per-lever scoring, matched guarantee design, and offer trimming/stacking. Decide with the user which guarantee is supportable, which bonuses are real and sustainable, and whether price presentation changes; pricing itself may be out of scope and that limit is recorded. Extend OFFER.md Offer Stack, Price Metric when the flow changes what price is charged per, and Willingness-to-Pay Evidence when new evidence exists; add offer tests to EXPERIMENTS.md and update tracker. Complete with a concrete change or reason for each Value Equation lever, guarantee aimed at the top researched objection, and a test hypothesis for every offer change.
<!-- vpmodule:atom:end conversion-optimization-offer -->
<!-- vpmodule:atom:begin conversion-optimization-operating-rules -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-operating-rules
title: Apply the operating rules
summary: "Resume from the tracker before anything else; intake on first run only; announce each phase and offer proceed, skip or defer; load the phase skill or its Brief; ask every decision question; present artifacts for sign-off; extend without overwriting; ship only measured and researched fixes with a test."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
  - phase-gate
conditions_applies_when: Running or resuming any conversion journey phase.
conditions_does_not_apply_when: A one-off question that does not run the journey.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each rule is followed and each phase transition leaves a tracker entry.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L39-L49"
status: active
revision: 1
---

# Apply the operating rules

On resumption, first read the tracker and every mapped artifact; if a tracker exists, summarize state in 3-5 lines and ask the user which phase to enter. Do not restart a tracked journey; enter only after the user confirms. On a first run, perform Intake, create the tracker with every phase statused pending, in-progress, awaiting-evidence, done, deferred with reason, or skipped with reason, and obtain user confirmation of the phase plan. Before phase work, announce its purpose, forced decision, artifact, and rough effort; offer proceed, skip, or defer, but a GATE phase may be deferred and never skipped. Mark it in-progress on proceed and begin after the user's choice. Load and use the phase skill; if unavailable, offer the named npx installation command; if declined, use the phase Brief as the minimum viable method and state which mode is used. Ask every listed user decision question with concrete options and a recommendation; record choices in Key Decisions. Present draft artifact content for sign-off before writing; after approval, write or extend docs and update tracker status, Key Decisions, and Next Actions. Read before writing, create missing artifacts only, otherwise extend and preserve others' content; recommendations must be checkboxes or table rows with owner and priority. When first creating a docs file, use the full artifact-template skeleton, then fill the phase sections. No fix ships without a Phase 1 measured leak and Phase 2 researched reason; every shipped change must be in EXPERIMENTS.md with a pre-committed primary metric and guardrail. Unsupported fixes return to Phase 2; bold changes without a test remain in the backlog.
<!-- vpmodule:atom:end conversion-optimization-operating-rules -->
<!-- vpmodule:atom:begin conversion-optimization-optional-phases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-optional-phases
title: Add optional phases when their condition appears
summary: "Add ux-heuristics for a confusing page, microinteractions for dead moments, scorecard-marketing for a lower-commitment entry and hooked-ux for post-conversion activation; follow the same operating rules and run the standalone method or install the skill."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The optional phase is inserted at its stated condition and extends the named artifact.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L217-L227"
status: active
revision: 1
---

# Add optional phases when their condition appears

Add ux-heuristics when the whole page confuses visitors before the conversion steps; microinteractions when flow moments have silent taps, unexplained waits, or abrupt changes; scorecard-marketing when a lower-commitment quiz or assessment is needed; and hooked-ux when post-conversion activation, rather than conversion, is the next-visit leak. Each extends its named artifact section. Optional phases follow core operating rules and are inserted when their add-when condition first becomes true. With no inline Brief, run the listed standalone method—severity-rated Nielsen 10 heuristics, trigger/rules/feedback/loops inventory, quiz funnel ending in a personalized result, or trigger/action/variable reward/investment loop audit—or install the named skill for its full framework.
<!-- vpmodule:atom:end conversion-optimization-optional-phases -->
<!-- vpmodule:atom:begin conversion-optimization-phases -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-phases
title: Run phases in order behind the gates
summary: "Run phases in listed order, each assuming the prior artifact; enter, skip or defer per the rules, but Phases 1-2 gate all downstream work and must address a measured leak with a researched reason; read the methods reference when running a Brief."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - phase-gate
conditions_applies_when: Entering any phase.
conditions_does_not_apply_when: A phase whose prior artifact does not exist.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The prior artifact exists and Phases 1-2 are satisfied before downstream work.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L66-L69"
status: active
revision: 1
---

# Run phases in order behind the gates

Run phases in listed order, each assuming the prior phase artifact exists. Entry, skipping, or deferral follows Operating Rules; Phases 1-2 gate downstream work, which must address a measured leak with a researched reason. When running a phase from its fallback Brief because its constituent skill is unavailable, read references/methods.md first; the Brief is only a summary and that reference contains the full methods, checklists, formulas, and benchmarks.
<!-- vpmodule:atom:end conversion-optimization-phases -->
<!-- vpmodule:atom:begin conversion-optimization-proof -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-proof
title: Place honest proof at every doubt
summary: "Answer each remaining objection with honest evidence at the exact step where doubt arises; use social proof, authority, commitment, reciprocity and only real scarcity; prefer specific contextual results, and treat fabricated proof or hidden costs as defects."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - proof-inventory
  - objection-handling
conditions_applies_when: Placing proof in the flow.
conditions_does_not_apply_when: A claim that needs no evidence.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every open objection has placed proof or an owned acquisition task, and no claim is unverifiable."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L152-L173"
status: active
revision: 1
---

# Place honest proof at every doubt

Answer every remaining objection with honest evidence at the exact step where doubt arises. Use social proof, authority, commitment, reciprocity, and only real scarcity; ask for commitment after the value moment, and give useful value first. Audit every O/CO row to ensure its counter is actually rendered at its placement. Prefer specific contextual results, then named testimonials with faces, case studies, statistics, and logos. If disclosure of a technique would make a visitor feel tricked, it fails; fabricated proof and hidden costs are defects. Invoke influence-psychology for per-step proof review, principle-to-objection mapping, and copy for the two highest-impact placements. Decide which proof exists or must be acquired, log acquisition as Next Actions, determine where scarcity/urgency is true, and choose commitment micro-asks. Extend FUNNEL.md Proof Inventory and complete O/CO placements; add proof tests to EXPERIMENTS.md and update tracker. Complete when each open objection has real proof placed or an owned acquisition task, with no unverifiable flow claim.
<!-- vpmodule:atom:end conversion-optimization-proof -->
<!-- vpmodule:atom:begin conversion-optimization-research -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-research
title: Research why visitors leave
summary: "Replace guesses with customers' own words from primary and secondary sources; classify objections as trust, price, fit, timing or effort; place an evidence-backed counter at the exact doubt; rank hypotheses by ICE and keep only changes that could plausibly double the step."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - voice-of-customer
  - objection-handling
conditions_applies_when: Researching the cause of a measured leak.
conditions_does_not_apply_when: A leak with no visitor evidence and no plan to collect it.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every objection quotes customer evidence and has a placed counter with an ICE rank.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L90-L111"
status: active
revision: 1
---

# Research why visitors leave

Phase 2 replaces guesses about the leak with evidence from real visitors; Phases 3-6 may fix only problems traceable to its findings. Mine primary sources, including exit and post-conversion questions, chat, tickets, and sales calls, plus secondary sources such as reviews and competitors, for customers' own words. Classify objections as Trust, Price, Fit, Timing, or Effort; each objection needs an evidence-backed counter placed at the exact step where doubt arises, never only in an FAQ. Diagnose each step with LIFT and MECLABS, rank hypotheses by ICE, and do not queue a change unless it could plausibly double the step under the 10x screen. Invoke cro-methodology for researched customer-word objections, placed O/CO counters, missing persuasion assets, and an ICE-ranked backlog. Decide with the user the primary researched leak driver, explicitly accept qualitative plus heuristic evidence when traffic is low, and identify implicit objections requiring CO-Only counters. Create FUNNEL.md with Flow Map & ONE Action, Leak Diagnosis, and Objections & Counters (O/CO); extend EXPERIMENTS.md backlog in ICE order. METRICS.md Funnel remains canonical for conversion numbers; Leak Diagnosis cites them and adds researched reason and severity. Update tracker. Complete when each step has one action, every researched objection has an evidence-backed counter and placement, and backlog is ICE-ranked.
<!-- vpmodule:atom:end conversion-optimization-research -->