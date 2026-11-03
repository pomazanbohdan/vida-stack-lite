---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-score-domain-model
title: Score the domain model against the DDD diagnostic
summary: Score satisfied diagnostic rows plus the depth properties and report the score and failing rows.
capability_tags:
  - audit-codebase
pattern_tags:
  - quality-bar-contract
conditions_applies_when: Assessing a domain model against the DDD diagnostic.
conditions_does_not_apply_when: A narrow implementation review that does not assess the domain model.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - score
  - failed_rows
artifact_contract_verified_by: The report states the score and the failing rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the domain model against the DDD diagnostic

Score one point for each satisfied diagnostic row and up to three additional points for the specified depth properties; report score and failing rows.
