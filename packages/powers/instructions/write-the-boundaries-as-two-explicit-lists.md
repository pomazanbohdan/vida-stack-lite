---
instruction_id: write-the-boundaries-as-two-explicit-lists
title: Write the boundaries as two explicit lists
summary: "The scope of a piece of work is written as an in-scope list and an out-of-scope list, never as narrative prose, and the section may not be empty."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The scope of a piece of work is written down.
conditions_does_not_apply_when: The scope is fixed and not written anywhere.
artifact_contract_output_type: scope-boundaries
artifact_contract_required_data:
  - the in-scope list
  - the out-of-scope list
  - the reason for each exclusion
artifact_contract_verified_by: both boundaries are explicit lists and the section is not empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Write the boundaries as two explicit lists
**Boundaries must be explicit lists:**
"In scope" — what this phase produces
"Out of scope" — what it explicitly does NOT do (with brief reasoning)
Boundaries section is MANDATORY — cannot be empty
"In scope" and "Out of scope" must be explicit lists, not narrative prose
