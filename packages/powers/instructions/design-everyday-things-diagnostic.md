---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: design-everyday-things-diagnostic
title: Run the design-of-everyday-things diagnostic
summary: "Audit discoverability, understanding, recovery, control-output mapping and constraints."
capability_tags:
  - audit-accessibility
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of an interface.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/design-everyday-things/SKILL.md; sha256=cd14143973b32c84583e8d94175410188c255f24169e78826f5b4dbf11fa4fa6; locator=skills/design-everyday-things/SKILL.md#L273-L284"
status: active
revision: 1
---

# Run the design-of-everyday-things diagnostic

Audit discoverability, understanding, recovery, control-output mapping, constraints; apply listed actions on failure.
