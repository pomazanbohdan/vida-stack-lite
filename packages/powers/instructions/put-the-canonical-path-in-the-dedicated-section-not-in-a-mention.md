---
instruction_id: put-the-canonical-path-in-the-dedicated-section-not-in-a-mention
title: "Put the canonical path in the dedicated section, not in a mention"
summary: "The references a later step must read are listed with their full path in the section that exists for them; a scattered mention of a name is not enough, and an absent section is reported as incomplete."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A record of decisions is written and the documents it depends on are named.
conditions_does_not_apply_when: The record has no section for references and none is needed.
artifact_contract_output_type: canonical-reference-section
artifact_contract_required_data:
  - the section that holds the references
  - the full path of each referenced document
  - what happens when the section is absent
artifact_contract_verified_by: every referenced document is named by its full path in the dedicated section
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/context-md.md
status: active
revision: 1
---

# Put the canonical path in the dedicated section, not in a mention
- The `<canonical_refs>` block is **mandatory**. Agents that find it absent treat the CONTEXT.md as incomplete and surface a warning.
- Inline mentions like "see ADR-019" scattered in `<decisions>` are insufficient; agents need the full path in the dedicated section.
