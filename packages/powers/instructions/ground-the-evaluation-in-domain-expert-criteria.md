---
instruction_id: ground-the-evaluation-in-domain-expert-criteria
title: Ground the evaluation in domain-expert criteria
summary: "The criteria are the ones a practitioner of the domain would use, in practitioner language."
capability_tags:
  - research-primary-sources
pattern_tags:
  - domain-language
conditions_applies_when: The evaluation strategy of an AI system is designed.
conditions_does_not_apply_when: The system has no domain-specific evaluation.
artifact_contract_output_type: evaluation-rubric
artifact_contract_required_data:
  - the criteria the domain experts use
  - the failure modes of this domain
artifact_contract_verified_by: the criteria are written in the language of the domain and name its failure modes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/AI-SPEC.md
status: active
revision: 1
---

# Ground the evaluation in domain-expert criteria
Domain-specific rubric ingredients — in practitioner language, not AI jargon
What Domain Experts Evaluate Against
Domain-specific failure modes from research — not generic hallucination, but how it manifests here
