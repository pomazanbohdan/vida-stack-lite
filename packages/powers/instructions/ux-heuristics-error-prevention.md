---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-error-prevention
title: Prevent errors before they happen
summary: "Constrain inputs, autocomplete, default sensibly and warn about unsaved changes; distinguish slips from mistakes."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing forms or high-risk interactions.
conditions_does_not_apply_when: A free-text field with no predictable error mode.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The design prevents likely slips and mistakes rather than only reporting them.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L131-L133"
status: active
revision: 1
---

# Prevent errors before they happen

Prevent problems with constrained inputs, autocomplete, sensible defaults, and unsaved-change warnings; distinguish prevention for slips from prevention for mistakes.
