---
instruction_id: apply-the-taxonomy-to-the-source-instead-of-generating-a-summary
title: Apply the taxonomy to the source instead of generating a summary
summary: The rules are applied to what the document actually contains; nothing is inferred and an absent field is marked absent.
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: A document is classified against a taxonomy.
conditions_does_not_apply_when: The task is to write a new document.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the type
  - the fields present in the source
artifact_contract_verified_by: no field carries content that the source did not contain
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 1
---

# Apply the taxonomy to the source instead of generating a summary
This is rule-application, not generation. Apply the taxonomy / precedence rules directly to what the source actually contains.
Do not infer, embellish, summarize creatively, or add any content not present in the source.
Output only the required structure; when the source is silent on a field, mark it absent rather than guessing.
