---
instruction_id: write-a-reference-as-type-location-section
title: "Write a reference as type, location, section"
summary: "A reference is one line of the form `type — location, section`, the nearest document, and it is opened before it is cited."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A work item points at another document.
conditions_does_not_apply_when: The item points at nothing outside itself.
artifact_contract_output_type: reference-list
artifact_contract_required_data:
  - one line per reference
  - "the type, the location and the section"
  - the fact that each reference was opened
artifact_contract_verified_by: "each reference is a `type — location, section` line naming the nearest document"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/ticket.md
status: active
revision: 1
---

# Write a reference as type, location, section
A reference is a line in References, `type — location, section`: location is a path from `{project-root}`, or a url for a remote source, and is opened before it is cited.
Name the nearest document, not the documents behind it.
