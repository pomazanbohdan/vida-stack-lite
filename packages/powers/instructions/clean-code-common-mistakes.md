---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-common-mistakes
title: Avoid common clean-code mistakes
summary: "Use descriptive names, specific exceptions, error-path tests, measured optimization and tests before refactoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing code for common quality mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the issue.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the applied correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L181-L195"
status: active
revision: 1
---

# Avoid common clean-code mistakes

Avoid the listed mistakes by using descriptive names, readable steps, refactoring instead of explanatory comments, specific exception handling, error-path tests, measured optimization, single-responsibility classes, tests before refactoring, consistent conventions, and non-null alternatives.
