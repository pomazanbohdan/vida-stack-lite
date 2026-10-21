---
instruction_id: stop-on-an-unknown-reviewer-name-instead-of-dropping-it
title: Stop on an unknown reviewer name instead of dropping it
summary: "A reviewer entry that is neither a defined instance nor a built-in is a hard error that is reported, not silently dropped."
capability_tags:
  - harden-validation
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A reviewer roster names an entry that resolves to nothing known.
conditions_does_not_apply_when: The entry resolves to a defined instance or a built-in.
artifact_contract_output_type: roster-error
artifact_contract_required_data:
  - the unknown entry
  - the error that was raised
artifact_contract_verified_by: the unknown entry was reported as an error and the run stopped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/reviewer-instances.md
status: active
revision: 1
---

# Stop on an unknown reviewer name instead of dropping it
An entry that is NEITHER a defined instance NOR a built-in slug is a **hard error** (likely a typo'd instance name) — stop and report it. Do NOT silently drop it
