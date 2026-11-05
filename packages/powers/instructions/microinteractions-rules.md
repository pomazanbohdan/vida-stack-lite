---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-rules
title: Make rules predictable and error-resistant
summary: "Derive rules from the interaction's goal, match mental models and platform conventions, constrain inputs by length, range and format, handle zero, maximum, repeated triggers and interruption, and never hide manipulative rules."
capability_tags:
  - design-microinteraction
pattern_tags:
  - predictable-rules
conditions_applies_when: Defining what happens after a trigger fires.
conditions_does_not_apply_when: A static screen with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Goal, conventions, input constraints and edge cases are specified."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L55-L78"
status: active
revision: 1
---

# Make rules predictable and error-resistant

Rules define what happens once a microinteraction is triggered: the sequence of events, constraints, processing, and ending; users never see rules directly but feel when they are wrong. Rules must be derived from the microinteraction's goal defined first, and must match existing mental models and platform conventions. Inputs must be constrained to prevent errors: limit character counts, set value ranges, enforce formats. Edge cases must be handled explicitly: zero, maximum, repeated triggers, interruption. Prohibition: keep rules transparent and predictable -- never hide rules that manipulate behavior, such as making unsubscribe harder than subscribe. Illustrative applications: password-strength meters evaluating input in real time, character counters that constrain and show remaining (turning red at the limit), and undo actions whose rules set a reversal time window (e.g., Gmail 'Undo send' for 30 seconds).
