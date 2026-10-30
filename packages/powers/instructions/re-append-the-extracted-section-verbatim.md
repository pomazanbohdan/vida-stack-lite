---
instruction_id: re-append-the-extracted-section-verbatim
title: Re-append the extracted section verbatim
summary: "The section that a rewrite would drop is extracted before the rewrite and appended back verbatim afterwards, so nothing is silently lost."
capability_tags:
  - curate-context
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A record is rewritten and it holds a section the rewrite would drop.
conditions_does_not_apply_when: The record holds no such section.
artifact_contract_output_type: preserved-section
artifact_contract_required_data:
  - the extracted section
  - the rewritten record it was appended to
artifact_contract_verified_by: the extracted section appears verbatim in the rewritten record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Re-append the extracted section verbatim
Append the extracted Backlog content verbatim to the end of the newly written ROADMAP.md.
This ensures 999.x backlog items are never silently dropped during milestone reorganization.
