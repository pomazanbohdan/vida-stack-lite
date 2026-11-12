---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-microinteractions-skill-md-9ffb2167-c02"
title: "wondelai-skills: skills/microinteractions/SKILL.md module"
summary: "Carrier for 2 atomic instructions from wondelai-skills:skills/microinteractions/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/microinteractions/SKILL.md\"}"
atom_ids:
  - microinteractions-simplify
  - microinteractions-triggers
atom_count: 2
atoms: "[{\"atom_id\":\"microinteractions-simplify\",\"file_sha256\":\"75b97cbc35ac8eb1163162828deedd8066d0da4a506f8c936326c57d6b1d3679\",\"content_sha256\":\"ee03c54e265f92d16ee0bd5c5b7b804fd549b827923ebbc04521cf534bcaf51c\",\"file_bytes\":2290,\"body_bytes\":1039},{\"atom_id\":\"microinteractions-triggers\",\"file_sha256\":\"bae698da702d7918fbfbc2407f2d1495266781b9951a995f3e5503354fe1caf9\",\"content_sha256\":\"5b5f28a86a667a52356eb59fd03185d0c252d591b7705f2b7c43ce766383352a\",\"file_bytes\":2239,\"body_bytes\":1001}]"
carrier_sha256: 8daa3ba408ae784e2f812c4ffd6e56f4a91fa01f76438ebdcdf666778b877418
carrier_bytes: 4748
revision: 1
status: active
---
<!-- vpmodule:atom:begin microinteractions-simplify -->
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
<!-- vpmodule:atom:end microinteractions-simplify -->
<!-- vpmodule:atom:begin microinteractions-triggers -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: microinteractions-triggers
title: Design discoverable triggers with visible states
summary: "Make every trigger communicate that it exists, what it does and its current state; scale prominence to action stakes; pair hidden gestures with visible alternatives; and never hide a critical trigger without a fallback."
capability_tags:
  - design-microinteraction
pattern_tags:
  - trigger-state
conditions_applies_when: Choosing or reviewing the trigger of a microinteraction.
conditions_does_not_apply_when: A system event with no user-facing control.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each trigger names existence, action and state, and hidden triggers have a visible alternative."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/microinteractions/SKILL.md; sha256=6be3a21ff34d6fb0fa5213b728e2a9e50d7e7ec68dbaf090bef1c518d83a6e31; locator=skills/microinteractions/SKILL.md#L31-L54"
status: active
revision: 1
---

# Design discoverable triggers with visible states

A trigger initiates a microinteraction and is its 'front door'; it may be manual (tap, click, swipe, voice command) or system-initiated (time, location, incoming data, error state). A trigger must communicate three things: that it exists, what it does, and what state it is in. Trigger prominence and labeling must match action importance -- high-stakes actions need prominent triggers. Invisible triggers (gestures, shake, proximity) must be paired with a visible alternative for discoverability. Trigger states -- default, hover, active, disabled, loading -- must be visually distinct. Prohibition: never hide critical triggers behind gestures or invisible interactions without a visible fallback. Illustrative applications: toggle controls (manual trigger with binary state), pull-to-refresh (hidden gesture with visible affordance, fires past a threshold), system alerts (system trigger on condition met, e.g., low-battery notification at 20%).
<!-- vpmodule:atom:end microinteractions-triggers -->