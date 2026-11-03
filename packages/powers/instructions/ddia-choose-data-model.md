---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddia-choose-data-model
title: Choose the data model from relationships and queries
summary: "Match relational, document or graph models to relationships and query patterns; account for schema timing, polyglot persistence and impedance mismatch."
capability_tags:
  - design-structure
pattern_tags:
  - query-plan-discipline
conditions_applies_when: Choosing a data model or schema for an application.
conditions_does_not_apply_when: A model fixed by an external contract that cannot change.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The chosen model matches the actual relationships and query patterns, with schema-on-write versus schema-on-read costs stated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/ddia-systems/SKILL.md; sha256=cdcd71bc1ce854f04921c5ff1a63b06872f96b09ef2f0576c91a33ffc8297012; locator=skills/ddia-systems/SKILL.md#L32-L53"
status: active
revision: 1
---

# Choose the data model from relationships and queries

Choose data models according to relationships and query patterns: relational models suit many-to-many and ad hoc queries, documents suit one-to-many and locality, and graphs suit recursive relationship traversal. Account for schema-on-write versus schema-on-read, polyglot persistence and impedance mismatch.
