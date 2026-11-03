---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-ui-diagnostic
title: Run the visual-interface diagnostic
summary: "Audit hierarchy in blur or grayscale, whitespace, label emphasis, spacing scale, text width, contrast and shadows."
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
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-ui/SKILL.md; sha256=d10d15b81aa00f427811741d83ac2bb918aabfae3d4489c751615bdf85e1674c; locator=skills/refactoring-ui/SKILL.md#L225-L239"
status: active
revision: 1
---

# Run the visual-interface diagnostic

Audit hierarchy in blur/grayscale, whitespace, label emphasis, spacing scale, text width, contrast, shadows; apply listed fixes.
