---
instruction_id: overwrite-the-single-valued-section-instead-of-appending-to-it
title: Overwrite the single-valued section instead of appending to it
summary: "A section whose fields hold one value each is replaced, not appended to; a second value for the same field is malformed input, not history."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The current-position section of a state file is being written.
conditions_does_not_apply_when: The section is a running log of positions.
artifact_contract_output_type: single-valued-section
artifact_contract_required_data:
  - the section that is replaced
  - the field that must appear once
  - what a duplicate line means
artifact_contract_verified_by: the section was replaced and holds one value per field
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/state-md.md
status: active
revision: 1
---

# Overwrite the single-valued section instead of appending to it
- **Every field in this section is single-valued, and the section is overwritten rather than appended to.** A second `Phase:` line is not a second position and is not history — it is malformed input.
- Write the section by replacing it, never by adding a line.
