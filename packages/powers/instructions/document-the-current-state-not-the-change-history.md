---
instruction_id: document-the-current-state-not-the-change-history
title: "Document the current state, not the change history"
summary: "Documentation describes the system as it is now, and the decisions worth preserving are recorded."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: "A change alters a public interface, an API or user-facing behaviour."
conditions_does_not_apply_when: The change is internal and leaves no documented surface behind.
artifact_contract_output_type: documentation-state-review
artifact_contract_required_data:
  - the documented surface
  - the description of its current state
  - the decision recorded
artifact_contract_verified_by: the documentation describes the present state in timeless language and the decision is written down
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/definition-of-done.md
status: active
revision: 1
---

# Document the current state, not the change history
Public interfaces, APIs, and user-facing behavior are documented
Architectural decisions worth preserving are recorded
Documentation describes the current state in timeless language, not the change history
