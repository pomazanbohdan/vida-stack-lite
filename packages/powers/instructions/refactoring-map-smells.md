---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: refactoring-map-smells
title: Map code smells to named refactorings
summary: Use the five smell families as structural signals and map each smell to a candidate named refactoring.
capability_tags:
  - simplify-code
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: Identifying structural problems before choosing a refactoring.
conditions_does_not_apply_when: A bug diagnosis with no structural signal.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The selected refactoring addresses the named smell rather than a symptom.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/refactoring-patterns/SKILL.md; sha256=e09d21bcca98b575df0014b3288df75afb556f2dd1d05135e6714d4c413d55d4; locator=skills/refactoring-patterns/SKILL.md#L33-L56"
status: active
revision: 1
---

# Map code smells to named refactorings

Use code smells as signals of structural problems and map them to named refactorings. The section identifies five smell families and gives examples mapping long methods, scattered changes, repeated parameters, and duplicated logic to candidate transformations.
