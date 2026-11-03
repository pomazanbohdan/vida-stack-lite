---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-score-change-readiness
title: Rate change readiness for untested code
summary: "Score readiness from 0 to 10 against test coverage, separation of behavior and refactoring, dependency intervention and failure modes, and report steps to reach 10."
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing how safely a change can be made to untested code.
conditions_does_not_apply_when: A code review that does not assess test coverage or change safety.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - steps
artifact_contract_verified_by: The report states the current score and the steps required to reach 10/10.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L18-L27"
status: active
revision: 1
---

# Rate change readiness for untested code

Rate changes to untested code from 0 to 10 against the stated principles and report the current score and steps required to reach 10/10. The score bands describe test coverage before edits, separation of behavior changes from refactoring, dependency intervention, and failure modes.
