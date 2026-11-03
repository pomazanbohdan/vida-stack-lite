---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-slips-and-mistakes
title: Distinguish slips from mistakes
summary: "Separate right-intent wrong-action slips from wrong-intent mistakes, and address each with the appropriate design response."
capability_tags:
  - design-user-interface
pattern_tags:
  - safe-defaults
conditions_applies_when: Designing error prevention or recovery.
conditions_does_not_apply_when: An error with no identifiable user intent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The response matches the error type rather than treating all errors alike.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L201-L219"
status: active
revision: 1
---

# Distinguish slips from mistakes

Distinguish slips (right intent/wrong action) from mistakes (wrong intent); address with separated destructive actions, reminders, visible modes, prompts, context, better models.
