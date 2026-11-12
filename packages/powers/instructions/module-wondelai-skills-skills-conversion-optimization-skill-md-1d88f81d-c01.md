---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-conversion-optimization-skill-md-1d88f81d-c01"
title: "wondelai-skills: skills/conversion-optimization/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/conversion-optimization/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/conversion-optimization/SKILL.md\"}"
atom_ids:
  - conversion-optimization-apply
  - conversion-optimization-common-mistakes
  - conversion-optimization-complete
  - conversion-optimization-core
  - conversion-optimization-experiments
  - conversion-optimization-find-leak
  - conversion-optimization-friction
  - conversion-optimization-intake
atom_count: 8
atoms: "[{\"atom_id\":\"conversion-optimization-apply\",\"file_sha256\":\"90e6f7147ed50fb541730fe92a2fe0b10c80aef4e7fa04acd6e7b78f362b2c20\",\"content_sha256\":\"80b6a83cbd7a63660e43d8272bf9c3a99690bbf75d633fe6ae5c8847eff223af\",\"file_bytes\":1547,\"body_bytes\":330},{\"atom_id\":\"conversion-optimization-common-mistakes\",\"file_sha256\":\"9b717fc13e6be959fc72e8215c79ed5c91997897fdcc371ea5032753a796cf15\",\"content_sha256\":\"7dbf777738e48d9d9f60f515f7dc59236cd56c783429770b93cd9d523eb307f4\",\"file_bytes\":1873,\"body_bytes\":641},{\"atom_id\":\"conversion-optimization-complete\",\"file_sha256\":\"f75d4ed2331f99ab38a34966ce675b5db38f71d73f02ec354ed28245e6829a26\",\"content_sha256\":\"51befff5d0e5607c1670da96089267de192ab957b9b9627ed8bc0ddfe968003c\",\"file_bytes\":2209,\"body_bytes\":967},{\"atom_id\":\"conversion-optimization-core\",\"file_sha256\":\"d984658e4ed795bab154fa7009d1698bcf1a18836d0e9a8b1e2a939371b8ebd6\",\"content_sha256\":\"156144f83fbc2ccb597b1c532b82e7fea1366cf9fa9cc81fa7497134e409c979\",\"file_bytes\":1663,\"body_bytes\":516},{\"atom_id\":\"conversion-optimization-experiments\",\"file_sha256\":\"e5dfe19514132b9668f12ec0164d7c3ad66ae40ef0817d6ea4db868f5d73ecb0\",\"content_sha256\":\"a97922586d08786cd60ace7516cba137ad3cca24d9b392fd3d26fa48d6c371a2\",\"file_bytes\":2710,\"body_bytes\":1422},{\"atom_id\":\"conversion-optimization-find-leak\",\"file_sha256\":\"a920a93d4f337861e0c575e3d4ce5a4a09059810f524e78c6044e07652a0711f\",\"content_sha256\":\"925480ca97a4b07865841b6d92e02eeff6b6e0b6e31db3aa7e569278df9f621a\",\"file_bytes\":2754,\"body_bytes\":1476},{\"atom_id\":\"conversion-optimization-friction\",\"file_sha256\":\"7b3492ee0f518ac0941a8dedaa40ec12ee07d8c2d979fd467b590d8a4375ca94\",\"content_sha256\":\"fffa227557865d71de1f81420570c26aa29b1d20f6dafd4789e33e40fa9e2a17\",\"file_bytes\":2654,\"body_bytes\":1342},{\"atom_id\":\"conversion-optimization-intake\",\"file_sha256\":\"cde23b8cbe02e56e68a7075134bd7e05f9cdd36c9bc22505fe51d0f38dc77f3b\",\"content_sha256\":\"b05e7807e915ec77df7b6064e1fdbd5f32bcfbf1ec01d7117f5afbe8d5001c15\",\"file_bytes\":2162,\"body_bytes\":918}]"
carrier_sha256: f6164517e5c27d05df9fa5ea6579e3a3a113041177a3d742bcc22bd3e6a438ab
carrier_bytes: 18551
revision: 1
status: active
---
<!-- vpmodule:atom:begin conversion-optimization-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-apply
title: Run a resumable conversion journey
summary: "Optimize one leaking conversion flow and its single desired action, not the whole site; ask before every decision, record outcomes in docs artifacts and allow the journey to resume after any phase."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: A website or in-product flow that leaks conversions.
conditions_does_not_apply_when: A whole-site audit or a flow with no single desired action.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The journey names one flow, one action and the artifacts that record each phase."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L10-L17"
status: active
revision: 1
---

# Run a resumable conversion journey

Run an interactive, resumable seven-phase optimization journey for one conversion flow and its single desired action, not for the whole site. Ask the user before every decision, record outcomes in the project's docs/ artifacts, and allow the journey to stop after any phase and resume later.
<!-- vpmodule:atom:end conversion-optimization-apply -->
<!-- vpmodule:atom:begin conversion-optimization-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-common-mistakes
title: Avoid the listed conversion mistakes
summary: "Avoid redesigning before measurement, guessing objections, polishing persuasion before clarity, testing cosmetics while the offer is fixed, faking scarcity or cherry-picking proof, adding unneeded fields and peeking at tests; apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a conversion plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L228-L239"
status: active
revision: 1
---

# Avoid the listed conversion mistakes

Avoid redesigning before Phase 1 measurement; guessing objections instead of using customer words; polishing persuasion before message clarity; testing cosmetics while treating the offer as fixed; faking scarcity or cherry-picking proof; adding unneeded form fields; and peeking or stopping tests early. Instead measure the money-path leak, mine customer sources, pass the five-second clarity test before persuasion, consider objection-linked offer changes, use only real scarcity and verifiable proof, collect only needed-now fields, and pre-commit sample size and duration before reporting results.
<!-- vpmodule:atom:end conversion-optimization-common-mistakes -->
<!-- vpmodule:atom:begin conversion-optimization-complete -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-complete
title: Close or loop the journey
summary: "After Phase 7 verdicts, re-enter Phase 1 with fresh numbers until the target line is met; close only with artifact-tied checks, carry remaining actions into the funnel and experiment files, and route to grow-website, improve-app or improve-website when the need moves."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - journey-loop
conditions_applies_when: Closing a journey or deciding the next leak.
conditions_does_not_apply_when: A journey still in its diagnosis phase.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every exit-check item is tied to an artifact and the next route is named.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L240-L253"
status: active
revision: 1
---

# Close or loop the journey

When Phase 7 verdicts arrive, re-enter Phase 1 with fresh numbers because a funnel always has a next-biggest leak; the journey's exit condition is the Phase 1 line in the sand, not exhaustion. Close only with artifact-tied checks: every phase is done, deferred with reason, or skipped with reason; OMTM, counter-metric, target line, and pre/post baselines are recorded; every researched objection has a placed, verifiable counter and no open money-path rows; no severity-4 friction remains without an owner; and every shipped change has an Experiment Card with pre-committed metric and recorded verdict. Carry remaining Next Actions into FUNNEL.md and EXPERIMENTS.md when closing the tracker. Route forward to grow-website when conversion is adequate but qualified traffic is needed, improve-app when the leak moves to engagement/retention, or improve-website when the broader site's appearance, typography, speed, or message needs work.
<!-- vpmodule:atom:end conversion-optimization-complete -->
<!-- vpmodule:atom:begin conversion-optimization-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-core
title: Follow the measured causal order
summary: "Find the leak with numbers, learn its cause from customers, then fix message, offer, proof and friction in that order, proving every fix with a pre-committed test."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - conversion-sequence
conditions_applies_when: Sequencing a conversion-optimization effort.
conditions_does_not_apply_when: A single isolated copy change with no measured leak.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan follows the stated order and ties each fix to a test.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L18-L26"
status: active
revision: 1
---

# Follow the measured causal order

Find the leak with numbers, determine its cause through customer research, then address message, offer, proof, and friction in that order; prove each fix with a pre-committed test. Numbers locate where loss occurs, research explains why, motivation must rise before friction reduction, and fixes without tests remain guesses. Sequence phases, ask decision questions, record choices in docs, and invoke constituent skills for their methods instead of improvising those frameworks.
<!-- vpmodule:atom:end conversion-optimization-core -->
<!-- vpmodule:atom:begin conversion-optimization-experiments -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-experiments
title: Prove fixes with pre-committed experiments
summary: "Pre-commit the primary and guardrail metrics, sample size at 95% significance and 80% power and a full business cycle; never peek or rerun to a desired answer; use a before/after window or reversible bet at low traffic; gate rollout on practical significance."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - experiment-design
  - experiment-precommit
conditions_applies_when: Testing a high-ICE fix.
conditions_does_not_apply_when: A fix with no test hypothesis.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each card has a pre-committed metric, sample size, duration and decision rule, and results carry verdicts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L195-L216"
status: active
revision: 1
---

# Prove fixes with pre-committed experiments

Turn high-ICE fixes into trustworthy experiments. Pre-commit the primary and guardrail metrics, including the Phase 1 counter-metric, revenue per visitor, and support volume; calculate sample size from baseline rate and minimum detectable effect at 95% significance and 80% power; and run for at least one full business cycle covering weekdays and weekends. Never peek and stop early or rerun until the desired answer appears. Test bold changes. For low traffic, use a before/after window with qualitative confirmation or a reversible bet with an explicit revert trigger, and state which. Practical significance gates rollout. Winners become the new control; losers become documented learnings. Invoke cro-methodology on top ICE hypotheses to design an If-change/then-metric/because-research hypothesis, pre-committed sample size and duration, and decision rule. Decide with the user which 1-3 money-path hypotheses run first, guardrails, and whether a flat result leads to iteration or Phase 2 research. Promote backlog rows to Experiment Cards with pre-committed per-arm sample size, duration, minimum worthwhile lift, and results/verdicts; add dated tested-metric baselines without overwriting pre-test baseline; update tracker. Complete when every shipped fix has a card, pre-committed metric, sample size, decision rule, results with verdicts, and updated OMTM baseline.
<!-- vpmodule:atom:end conversion-optimization-experiments -->
<!-- vpmodule:atom:begin conversion-optimization-find-leak -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-find-leak
title: Find the leak and choose one metric
summary: "Express each step as a conversion rate, compare with history and benchmarks, find the largest absolute drop on the highest-value path, choose the OMTM and a counter-metric with a target line, and segment cohorts so a collapsing segment is not hidden."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - leak-diagnosis
  - one-metric
conditions_applies_when: Diagnosing where a flow loses people.
conditions_does_not_apply_when: A flow with no step data and no instrumentation plan.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The leak is localized to one step and the OMTM, counter-metric and target line are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L70-L89"
status: active
revision: 1
---

# Find the leak and choose one metric

Phase 1 must locate the actual drop-off and select the journey's OMTM before forming opinions about causes. Express each flow step as a conversion rate; compare with the site's history and published benchmarks; identify the largest absolute drop on the highest-value money path; use a comparative ratio that informs action rather than totals or cumulative vanity charts; select the OMTM and a counter-metric that prevents gaming; define target, date, and pre-committed response to a miss; and examine cohorts and segments such as channel, device, and plan so a collapsing segment is not hidden by an average. Invoke lean-analytics to produce step funnel baselines and benchmarks, OMTM and counter-metric, and the leak ranked by absolute lost value. Decide with the user on the metrics, leak to attack first based on absolute money-path loss rather than easiest percentage, and minimal events if instrumentation is missing; keep the phase awaiting-evidence until those numbers exist. Extend METRICS.md Funnel, Stage & One Metric That Matters, and Baselines & Targets, and update the tracker. The gate is complete when measurement is only as fine-grained as needed to localize one step, OMTM and counter-metric and line in the sand are recorded, and the leak is named; only then unlock Phases 2-7. Finer substeps awaiting instrumentation remain awaiting-evidence in Next Actions and do not block if the named leak does not depend on them.
<!-- vpmodule:atom:end conversion-optimization-find-leak -->
<!-- vpmodule:atom:begin conversion-optimization-friction -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-friction
title: Remove friction for visitors ready to act
summary: "Raise ability and sharpen prompts: clear signifiers, constraints that prevent errors, feedback within 0.1 seconds, progress on multi-step flows, minimum fields, all costs before the final step, guest checkout, inline validation and blame-free errors with undo."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - friction-reduction
  - form-friction
conditions_applies_when: "Auditing form, payment and confirmation steps."
conditions_does_not_apply_when: A flow with no interactive step.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every step has a friction row, forms are cut to minimum fields and required payment rules are met or marked n/a."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L174-L194"
status: active
revision: 1
---

# Remove friction for visitors ready to act

Protect visitors ready to act by raising Ability and sharpening Prompts after Phases 3-5 raise Motivation (B=MAP). Bridge execution and evaluation gulfs: use clear signifiers, constraints that prevent errors, feedback within 0.1 seconds of every action, and progress indication on multistep flows. Minimize fields, request payment as late as possible, show all costs before the final step, offer guest checkout, validate inline with corrective messages, and write blame-free errors explaining what happened and how to fix it; slips get undo rather than confirmation dialogs. Invoke design-everyday-things on form, payment, and confirmation steps for signifier, constraint, feedback, field-cut, and message findings. Decide required-now versus later fields, constraints versus warnings, earlier total cost, and whether severity-4 friction ships as a logged before/after card or waits for a full test. Extend FUNNEL.md Flow Friction Audit, DESIGN.md UX Audit Findings with Norman gulf in Heuristic, and EXPERIMENTS.md backlog; update tracker. Complete with an audit row per step, minimum-field forms, owners for severity-4 items, and compliant error messages. For payment flows, all costs must be visible before final step and guest checkout offered; mark these two rows n/a when no payment occurs.
<!-- vpmodule:atom:end conversion-optimization-friction -->
<!-- vpmodule:atom:begin conversion-optimization-intake -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: conversion-optimization-intake
title: Run intake before creating the tracker
summary: "Ask for the flow and its one action, drop-off data, weekly volume, voice-of-customer sources, the current offer and its changeability, existing positioning or offer documents, and the desired journey scope; then create and confirm the tracker."
capability_tags:
  - run-conversion-journey
pattern_tags:
  - resumable-journey
conditions_applies_when: First run with no conversion tracker.
conditions_does_not_apply_when: A resumed journey that already has a tracker.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every intake question is answered and the tracker exists with confirmed phase statuses.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/conversion-optimization/SKILL.md; sha256=fbf2102e39441b4ea6d5177c52e09fcfaa10ad72cf3beee6b484ea659412324c; locator=skills/conversion-optimization/SKILL.md#L50-L65"
status: active
revision: 1
---

# Run intake before creating the tracker

Before creating the tracker, ask which flow and ONE end action are in scope; where analytics show drop-off and what funnel, cohort, or step data are available; weekly traffic or volume; which customer-voice sources exist and whether raw text can be supplied; the current conversion-point offer, price, guarantee, bonuses, and whether it can change; whether POSITIONING.md or OFFER.md already exists; and how much of the journey the user wants now. Then create the plan from the template and confirm it. Never skip Phases 1–2. Phase 3 may be skipped when messaging was already validated; Phase 4 may be skipped with a recorded reason when contract-fixed; Phase 7 may be deferred with a reason at very low traffic in favor of before/after evidence and an explicit revert trigger, but never silently skipped. Record all phase statuses and obtain user confirmation of the plan.
<!-- vpmodule:atom:end conversion-optimization-intake -->