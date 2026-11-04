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
