---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-diagnostic
title: Run the software-design diagnostic
summary: "Check module purpose, interface depth, information hiding, interface comments, complexity review, hidden decisions, newcomer understanding and regular design improvement."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a design.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L178-L190"
status: active
revision: 1
---

# Run the software-design diagnostic

Use the eight diagnostic questions to check coherent module purpose, interface depth, information hiding, interface comments, complexity review, hidden decisions, newcomer understanding and regular design improvement.
