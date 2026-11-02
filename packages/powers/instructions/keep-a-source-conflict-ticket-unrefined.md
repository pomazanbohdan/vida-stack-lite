---
instruction_id: keep-a-source-conflict-ticket-unrefined
title: Keep a source-conflict ticket unrefined
summary: "When the code contradicts a Requirements line, record a `Source conflict:` line, offer the correction through `spec.md`, and keep covering tickets `refined: false` until a `Decision:` line settles it."
capability_tags:
  - clarify-requirements
pattern_tags:
  - stop-on-conflict
  - requirements-clarification
conditions_applies_when: A ticket is refined and the code contradicts a Requirements line it covers.
conditions_does_not_apply_when: The code agrees with the source or the ticket covers no conflicting line.
artifact_contract_output_type: source-conflict-record
artifact_contract_required_data:
  - the conflicting id or section
  - what the source says and what was found
  - the tickets left unrefined
artifact_contract_verified_by: "the conflict is recorded and every covering ticket stays `refined: false` until a `Decision:` line settles it"
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
  - engineering
---

# Keep a source-conflict ticket unrefined
Where the code contradicts a Requirements line, add a `Source conflict: <id or section> — <what the source says> vs <what was found>` line to the Notes of the container that owns the line.
Tell the user and offer the correction through `spec.md`.
Tickets covering that id stay `refined: false` until a `Decision:` line settles it.
