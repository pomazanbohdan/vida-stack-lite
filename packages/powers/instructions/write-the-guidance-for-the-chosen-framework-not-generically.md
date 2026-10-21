---
instruction_id: write-the-guidance-for-the-chosen-framework-not-generically
title: "Write the guidance for the chosen framework, not generically"
summary: Every pitfall and example is specific to the framework and the use case; an unverified API is marked as unverified.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: Implementation guidance is written for a chosen framework.
conditions_does_not_apply_when: The guidance is about the business domain rather than the framework.
artifact_contract_output_type: implementation-guide
artifact_contract_required_data:
  - the pitfalls
  - the examples
artifact_contract_verified_by: no pitfall or example is generic and every unverified API is marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-ai-researcher.compact.md
status: active
revision: 1
---

# Write the guidance for the chosen framework, not generically
Pitfalls specific — "use async where supported" is useless
No hallucinated API methods — note "verify in docs" if unsure
Section 4b examples specific to `framework` + `system_type`, not generic
