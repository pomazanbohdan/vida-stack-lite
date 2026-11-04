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
