---
instruction_id: show-the-override-and-wait-for-an-explicit-yes
title: Show the override and wait for an explicit yes
summary: "The full override is shown, a diff when the file exists, and nothing is written before an explicit yes."
capability_tags:
  - write-configuration-override
pattern_tags:
  - approval-policy-gate
conditions_applies_when: An override file is about to be written or changed.
conditions_does_not_apply_when: The file was written before it was shown.
artifact_contract_output_type: configuration-override
artifact_contract_required_data:
  - the full override
  - the diff against the existing file
artifact_contract_verified_by: nothing was written before the user answered yes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-customize/SKILL.md
status: active
revision: 1
---

# Show the override and wait for an explicit yes
Show the full TOML. If the file exists, show a diff. Never silently overwrite.
Wait for explicit yes.
