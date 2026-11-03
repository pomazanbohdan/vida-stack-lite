---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ux-heuristics-user-control
title: Give users control and an exit
summary: "Prefer undo to confirmation, include cancel or exit in every flow, and keep the back button working."
capability_tags:
  - design-user-interface
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing a flow with destructive or irreversible actions.
conditions_does_not_apply_when: A read-only view with no state change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Every flow has a clear exit and destructive actions are reversible where possible.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ux-heuristics/SKILL.md; sha256=cb1ea3de8b6e605614cc59b21d41830d2d82af22e51069bb4c5bb53790cd622b; locator=skills/ux-heuristics/SKILL.md#L125-L127"
status: active
revision: 1
---

# Give users control and an exit

Provide clear emergency exits; prefer undo to confirmation dialogs, include cancel or exit in every flow, and ensure back buttons do not break.
