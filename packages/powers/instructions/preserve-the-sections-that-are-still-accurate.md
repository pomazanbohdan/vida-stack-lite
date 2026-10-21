---
instruction_id: preserve-the-sections-that-are-still-accurate
title: Preserve the sections that are still accurate
summary: Only the inaccurate and the missing sections are rewritten; the prose somebody else wrote and that still holds stays.
capability_tags:
  - write-technical-prose
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: An existing document is brought up to date.
conditions_does_not_apply_when: The document is written from scratch.
artifact_contract_output_type: documentation-update
artifact_contract_required_data:
  - the rewritten sections
  - the preserved sections
artifact_contract_verified_by: the accurate sections are unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-doc-writer.compact.md
status: active
revision: 1
---

# Preserve the sections that are still accurate
Rewrite only the inaccurate or missing sections. Preserve user-authored prose in sections that are still accurate.
Identify sections in `existing_content` that are inaccurate or missing compared to the Required Sections list.
