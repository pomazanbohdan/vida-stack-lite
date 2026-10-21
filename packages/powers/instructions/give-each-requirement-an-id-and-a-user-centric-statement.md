---
instruction_id: give-each-requirement-an-id-and-a-user-centric-statement
title: Give each requirement an id and a user-centric statement
summary: "A requirement carries a category identifier and a statement that is user-centric, testable and atomic."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stable-identity
conditions_applies_when: A requirement is written down.
conditions_does_not_apply_when: The requirement already has its identifier.
artifact_contract_output_type: requirement-entry
artifact_contract_required_data:
  - the identifier
  - the user-centric statement
artifact_contract_verified_by: every requirement carries an identifier and a user-centric testable statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/requirements.md
status: active
revision: 1
---

# Give each requirement an id and a user-centric statement
- ID: `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02, SOCIAL-03)
- Description: User-centric, testable, atomic
