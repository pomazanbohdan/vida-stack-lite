---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-diagnostic
title: Run the clean-code diagnostic
summary: Use the diagnostic questions to find gaps and apply the corresponding actions.
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a codebase or change.
conditions_does_not_apply_when: A full audit or a scored review; use the score instruction.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report lists findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L196-L210"
status: active
revision: 1
---

# Run the clean-code diagnostic

Use the diagnostic questions to identify code-quality gaps and follow the corresponding actions, including renaming, extraction, removing commented-out code, separating error handling, testing public methods, and addressing duplication and magic numbers.
