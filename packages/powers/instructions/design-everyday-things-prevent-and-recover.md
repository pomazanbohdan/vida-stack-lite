---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-prevent-and-recover
title: Prevent errors and support recovery
summary: "Use constraints, undo, confirmation, defaults and forgiving input to prevent; use clear messages, preserved work and reset paths to recover."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing a flow with destructive or error-prone actions.
conditions_does_not_apply_when: A read-only flow with no error risk.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The flow prevents likely errors and lets users recover without losing work.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L220-L233"
status: active
revision: 1
---

# Prevent errors and support recovery

Prevent with constraints, undo/redo, destructive-action confirmation, defaults, forgiving input. Recover with clear messages, preserved work, partial saves, known-good reset, alternative path.
