---
instruction_id: replace-only-the-targeted-section-and-leave-the-rest-untouched
title: Replace only the targeted section and leave the rest untouched
summary: Only the named section is replaced; everything around it and the numbering stay as they were.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: One section of a larger document is being replaced.
conditions_does_not_apply_when: The whole document is being rewritten.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the replaced section
  - the untouched surroundings
artifact_contract_verified_by: everything before and after the section is unchanged and the numbering is preserved
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/edit-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Replace only the targeted section and leave the rest untouched
locate the phase section by its header
and replace exactly the old section text with the new section text.
All content before and after the section (including other phases, milestone headers, and the summary checklist) must be left unchanged.
Don't renumber the phase — number and position must be preserved exactly
Don't modify other phases when editing one
always replace section in place
