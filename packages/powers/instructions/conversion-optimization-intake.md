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
