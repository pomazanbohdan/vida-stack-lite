---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-loops-modes
title: Design loops and use modes sparingly
summary: "Classify loops as open, closed or long; mature the interaction over time through progressive reduction; minimize modes and make the current one highly visible; and never adapt loops to increase notifications or obstruct opt-outs."
capability_tags:
  - design-microinteraction
pattern_tags:
  - loop-mode
conditions_applies_when: Designing interaction behavior over time or with modes.
conditions_does_not_apply_when: A one-shot interaction that never recurs.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Loop type, change over time and mode visibility are specified."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L104-L127"
status: active
revision: 1
---

# Design loops and use modes sparingly

Loops are the meta-rules over time -- whether the interaction changes after the 100th use, expires, or adapts; modes are forks in the rules where the same control temporarily behaves differently (e.g., edit mode vs. view mode). Open loops continue until explicitly stopped (a repeating alarm); closed loops run once and end (a timer); long loops change the interaction over time (first use shows a tooltip, the 50th does not). Progressive reduction: strip away scaffolding as users demonstrate mastery. Modes are dangerous because they violate 'same action, same result': minimize them and make the current mode highly visible (Caps Lock indicator, edit banner). Prohibition: loops should benefit the user, not the business -- never adapt loops to ramp up notifications or make opt-outs progressively harder. Illustrative applications: onboarding tooltips via long loops (first 3 sessions show 'Swipe to archive', then stop), alarms as open loops repeating until disabled, text editing view/edit modes with a visible 'Editing' banner and 'Done' exit.
