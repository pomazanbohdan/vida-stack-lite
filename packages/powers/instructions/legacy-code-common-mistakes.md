---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: legacy-code-common-mistakes
title: Avoid common legacy-code mistakes
summary: "Avoid mixing refactoring with behavior changes, imagined-requirement tests, excessive mocking, big-bang rewrites, silent bug fixes, invasive cleanup and untracked sprouts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a change to legacy code for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/working-with-legacy-code/SKILL.md; sha256=4a621798f9a51ad1438f5b25b168615b7caeb540378c8f4d70ab733523135e21; locator=skills/working-with-legacy-code/SKILL.md#L171-L183"
status: active
revision: 1
---

# Avoid common legacy-code mistakes

Avoid mixing refactoring with behavior changes, writing tests from imagined requirements, excessive mocking, big-bang rewrites, silently fixing characterized bugs, invasive pre-test cleanup, untracked sprouts, and waiting for a separate testing project; apply each row's stated corrective practice.
