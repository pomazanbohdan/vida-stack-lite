---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-code-reader-first
title: Optimize code for readers
summary: "Choose names, function boundaries and formatting for the reader, and leave code cleaner than found."
capability_tags:
  - simplify-code
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "Writing, reviewing or refactoring code where readability and maintainability matter."
conditions_does_not_apply_when: Generated code or throwaway scripts that will not be maintained.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The change makes names, boundaries or formatting easier to follow."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-code/SKILL.md; sha256=072b309df4ea3e271232f281d8a98d759f6f27a310a74b1fd6e8f70ec3a9b04f; locator=skills/clean-code/SKILL.md#L14-L17"
status: active
revision: 1
---

# Optimize code for readers

Optimize code for readers: use clear names, purposeful function boundaries and consistent formatting because code is read much more often than written; leave code cleaner than found.
