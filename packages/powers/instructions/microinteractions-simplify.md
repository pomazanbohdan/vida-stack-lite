---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-simplify
title: Reduce and simplify the interaction
summary: "Reduce options, steps and decisions, then simplify what remains; treat a need for instructions as too complex, use user-serving smart defaults, collapse multi-step interactions, disclose progressively, and keep rule count proportional to frequency."
capability_tags:
  - design-microinteraction
pattern_tags:
  - interaction-simplification
conditions_applies_when: Reducing complexity in a frequent interaction.
conditions_does_not_apply_when: A one-off expert workflow that genuinely needs its options.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Options, steps and rules are reduced and smart defaults serve the user."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L153-L175"
status: active
revision: 1
---

# Reduce and simplify the interaction

The best microinteraction is barely noticed because it is simple and fast: reduce the number of options, steps, and decisions, then simplify what remains until it feels effortless. Every option, field, and decision adds cognitive load, so if a microinteraction needs instructions it is too complex; remove options with smart defaults by picking the best choice and committing to it, collapse multi-step interactions into a single action where possible, use progressive disclosure to show simple first and reveal complexity only on request, and keep the rule count proportional to frequency of use so common actions need few rules. The most elegant microinteractions have zero configuration, one action, and immediate results; representative cases include opening the camera in photo mode, double-tap to like, and pre-filling city and state from a ZIP code. A smart default must serve the user, not the business: never pre-check marketing opt-ins, paid add-ons, or data-sharing as the default choice.
