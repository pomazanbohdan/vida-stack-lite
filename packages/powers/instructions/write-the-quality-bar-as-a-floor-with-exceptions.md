---
instruction_id: write-the-quality-bar-as-a-floor-with-exceptions
title: Write the quality bar as a floor with an exceptions table
summary: "The bar is one file with a floor, enforced numbers, measured-only metrics and an exceptions table whose rows carry an owner and an expiry date."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The quality bar of a project is written down for others to run.
conditions_does_not_apply_when: The bar already exists and only its thresholds change.
artifact_contract_output_type: quality-bar
artifact_contract_required_data:
  - the floor
  - the enforced numbers
  - the measured-only metrics with today values
  - the exceptions table with owners and expiry dates
artifact_contract_verified_by: every number in the file carries a stated reason
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/constraints.md
status: active
revision: 1
---

# Write the quality bar as a floor with an exceptions table
3. **Write CONSTRAINTS.md** at the repo root with a Floor section, enforced numbers, measured-only metrics with today's values, and an exceptions table with owners and expiry dates. Every number needs a stated reason.
