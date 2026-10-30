---
instruction_id: write-the-list-as-a-list-not-as-a-joined-string
title: "Write the list as a list, not as a joined string"
summary: "A list is written as a list: the reader never splits a string, so a joined value would be stored as one entry and would silently fail to resolve."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A setting holds several values.
conditions_does_not_apply_when: The setting holds one value.
artifact_contract_output_type: written-list
artifact_contract_required_data:
  - the entries
  - the form they were written in
artifact_contract_verified_by: the value is a list of entries and not one joined string
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Write the list as a list, not as a joined string
the resolver never splits strings, so a comma-joined string would be stored as ONE skill path that silently fails resolution
Split on commas, trim each entry, drop empty entries
write the JSON array form
