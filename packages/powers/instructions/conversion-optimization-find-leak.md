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
