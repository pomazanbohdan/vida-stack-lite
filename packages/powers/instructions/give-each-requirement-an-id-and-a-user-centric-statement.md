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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Give each requirement an id and a user-centric statement
- ID: `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02, SOCIAL-03)
- Description: User-centric, testable, atomic
