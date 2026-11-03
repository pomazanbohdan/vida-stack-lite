---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-common-mistakes
title: Avoid common refactoring mistakes
summary: "Avoid refactoring without tests, big-bang rewrites, mixed feature work, stale caller references, unclear micro-methods, ignored smells, doomed polish and optimization during refactoring."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a refactoring for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the corrective practice.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L176-L188"
status: active
revision: 1
---

# Avoid common refactoring mistakes

Avoid refactoring without tests, big-bang rewrites, mixing refactoring with feature work, stale caller references after renames, unclear micro-methods, ignoring smells, polishing doomed code, and optimizing during refactoring; use the table's stated corrective practices.
