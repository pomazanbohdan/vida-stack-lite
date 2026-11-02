---
instruction_id: mark-an-entry-ready-to-refine
title: Mark an entry ready to refine
summary: "An entry that needs full criteria before it starts carries `refine = true` and `refined: false`; `tickets.py next` lists it under `ready_to_refine`."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - approval-policy-gate
conditions_applies_when: A bug, a story with no epic, or an entry the user wants fully specified is planned.
conditions_does_not_apply_when: The story builds from its entry without full criteria.
artifact_contract_output_type: refine-flag
artifact_contract_required_data:
  - the entry
  - the `refine` and `refined` values
  - the user's approval that clears the flag
artifact_contract_verified_by: "the entry carries `refine = true` and `refined: false` until the user approves the criteria"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Mark an entry ready to refine
A refine sets `refine = true` on the entry and `refined: false` in the file.
`tickets.py next` lists under `ready_to_refine` every bug, entry with `refine = true`, and leaf with no entry.
A story with no file is pulled before refinement.
A refined ticket sets `refined: true` on the user's approval; a review sets neither `refined` nor `status`.
