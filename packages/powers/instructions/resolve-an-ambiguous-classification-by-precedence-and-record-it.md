---
instruction_id: resolve-an-ambiguous-classification-by-precedence-and-record-it
title: Resolve an ambiguous classification by precedence and record it
summary: "When two types compete, the higher-precedence signal decides and the ambiguity is written down."
capability_tags:
  - triage-reports
pattern_tags:
  - source-hierarchy
conditions_applies_when: Two document types compete for the same file.
conditions_does_not_apply_when: One type is clearly indicated by frontmatter or file name.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the chosen type
  - the recorded ambiguity
artifact_contract_verified_by: the type follows the precedence order and the ambiguity is noted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-classifier.compact.md
status: active
revision: 1
---

# Resolve an ambiguous classification by precedence and record it
Ambiguity rule: If two types compete at roughly equal strength, pick the one with the highest-precedence signal (ADR > SPEC > PRD > DOC). Record the ambiguity in `notes`.
