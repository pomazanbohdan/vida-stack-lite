---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-common-mistakes
title: Avoid common domain-modeling mistakes
summary: "Avoid technical-only names, one universal model, oversized aggregates, anemic models, unprotected integrations and skipped domain experts."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Reviewing a domain model for the listed mistakes.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review names the mistake and the domain-centered correction.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L162-L173"
status: active
revision: 1
---

# Avoid common domain-modeling mistakes

Avoid technical-only names, one universal model, oversized aggregates, anemic models, unprotected external integrations, treating contexts as deployment units, and skipping domain experts; apply the listed domain-centered corrections.
