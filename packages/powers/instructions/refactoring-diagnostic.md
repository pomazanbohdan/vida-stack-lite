---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-diagnostic
title: Run the refactoring diagnostic
summary: "Check test status, smell identification, method and class responsibilities, duplication, conditional polymorphism, per-step commits and readability."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review before or after refactoring.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L189-L201"
status: active
revision: 1
---

# Run the refactoring diagnostic

Use the eight diagnostic questions to check test status, smell identification, method and class responsibilities, duplication, conditional polymorphism, per-step commits, and readability; apply the corresponding action when a check fails.
