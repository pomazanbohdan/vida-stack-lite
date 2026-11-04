---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-business-phases
title: Run phases in order
summary: "Run phases in order unless intake reorders them; each phase reads earlier docs and, when an upstream phase was skipped, uses intake facts and flags the missing input rather than inventing it."
capability_tags:
  - build-growth-engine
pattern_tags: []
conditions_applies_when: Entering any phase.
conditions_does_not_apply_when: A phase whose upstream input is missing without a flag.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The order is preserved or reordered by intake, and missing inputs are flagged."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-business/SKILL.md; sha256=114d4477a4d53234d3d58a4142a156bc55406137105f733ff6b9213236f762e7; locator=skills/grow-business/SKILL.md#L65-L68"
status: active
revision: 1
---

# Run phases in order

Run phases in order unless intake reorders them. A phase reads earlier docs; when an upstream phase was skipped, use intake facts and flag missing input instead of inventing it.
