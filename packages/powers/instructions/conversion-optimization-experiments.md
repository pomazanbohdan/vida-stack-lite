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
