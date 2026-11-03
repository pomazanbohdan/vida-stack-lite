---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-diagnostic
title: Run the DDD diagnostic
summary: "Check domain language, context boundaries, aggregate size, behavior-rich objects, event use, integration translation and core-domain identification."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A quick diagnostic review of a domain model.
conditions_does_not_apply_when: A full audit or a scored review.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - findings
  - actions
artifact_contract_verified_by: The report answers each diagnostic question with findings and actions.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L174-L185"
status: active
revision: 1
---

# Run the DDD diagnostic

Use the seven diagnostic questions to check domain language, explicit context boundaries, aggregate size, behavior-rich domain objects, event use, translation at external integrations and identification of the Core Domain.
