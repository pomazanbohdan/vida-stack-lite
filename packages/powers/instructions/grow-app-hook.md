---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-hook
title: Design the Hook loop
summary: "Build Trigger, Action, Variable Reward and Investment; migrate external triggers to an internal emotion, make the action trivial, vary reward across tribe, hunt and self, place investment after reward and check every reward against the Manipulation Matrix."
capability_tags:
  - design-retention-engine
pattern_tags:
  - habit-loop
  - manipulation-matrix
conditions_applies_when: Designing why users return without paid prompts.
conditions_does_not_apply_when: A one-off use with no repeat goal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "All four phases are rated, the weakest is named and the first session completes one full loop."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L62-L78"
status: active
revision: 1
---

# Design the Hook loop

Design a Hook loop that brings users back through an internal trigger rather than a paid notification. In the fallback method, map Trigger → Action → Variable Reward → Investment; migrate external push/email triggers to internal emotions such as boredom, FOMO or anxiety, make the action trivially simple, vary reward across tribe/hunt/self, and place investment after reward so it raises switching cost and loads the next trigger. Treat any weak phase as stalling the loop. With hooked-ux, map and rate all four phases 0–10, identify the weakest, and design honest data-powered variable rewards checked against the Manipulation Matrix. Ask the user to confirm one internal trigger, choose the weakest phase and high-leverage fix or defer if the loop is already forming at 5%+ unprompted return, and choose a reward type while rejecting concepts that fail the matrix. Extend PRODUCT.md Hook Model with trigger, action, variable reward, investment, weakest phase and fix; update the tracker. Done only when all are recorded, onboarding lets a new user complete one full Hook cycle in the first session, and the user picked the fix to ship.
