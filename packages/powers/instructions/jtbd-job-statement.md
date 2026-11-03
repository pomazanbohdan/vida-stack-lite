---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: jtbd-job-statement
title: Write a structured job statement
summary: "Separate the context, desired progress and expected outcome in a job statement."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: Documenting a customer job for product decisions.
conditions_does_not_apply_when: A solution description that names the product instead of the job.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - context
  - progress
  - outcome
artifact_contract_verified_by: "The statement separates context, progress and outcome without naming a product."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/jobs-to-be-done/SKILL.md; sha256=cc227aa837bda4ae0910324e52a90d338354501d005f7ef2fbd0cff9fd73aaf1; locator=skills/jobs-to-be-done/SKILL.md#L39-L65"
status: active
revision: 1
---

# Write a structured job statement

A job statement captures the progress a customer seeks in a specific circumstance, in a structured format separating context, desired progress, and expected outcome.
