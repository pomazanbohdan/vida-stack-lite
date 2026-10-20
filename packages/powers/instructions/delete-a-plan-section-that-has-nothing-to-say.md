---
instruction_id: delete-a-plan-section-that-has-nothing-to-say
title: Delete a plan section that has nothing to say
summary: A section with no content is deleted from the plan; a placeholder such as N/A or None is never written in its place.
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A plan section has no content to carry.
conditions_does_not_apply_when: "The section has something to say, even if the content is short."
artifact_contract_output_type: plan-section-decision
artifact_contract_required_data:
  - the sections that were deleted
  - the sections that were kept
artifact_contract_verified_by: no section of the plan holds a placeholder in place of content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/plan-template.md
status: active
revision: 1
---

# Delete a plan section that has nothing to say

Do not write "N/A" or "None".

- If the approach is straightforward, delete this section.
- If no build, test, or lint commands apply, delete this section.
- If no meaningful I/O scenarios exist, delete this section.
