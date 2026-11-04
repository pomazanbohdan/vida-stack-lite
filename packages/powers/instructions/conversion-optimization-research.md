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
