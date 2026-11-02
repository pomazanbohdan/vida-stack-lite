---
instruction_id: read-the-ticket-before-answering-about-it
title: Read the ticket before answering about it
summary: "On every request about a ticket, read the ticket at the altitude asked — initiative, epic or leaf — first and in full before running the board or opening any other file."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - progressive-disclosure
conditions_applies_when: A request concerns an initiative, an epic or a leaf in the ticket tree.
conditions_does_not_apply_when: The request is an explicit start of a leaf.
artifact_contract_output_type: ticket-read
artifact_contract_required_data:
  - the ticket at the altitude asked
  - the file it was read from
artifact_contract_verified_by: the ticket was read in full before the board ran or another file was opened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/workflow.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Read the ticket before answering about it
On every request about a ticket, read the ticket at the altitude asked: the initiative's file, an epic's file, or a leaf's file when pulled; a leaf with no file is its entry and its epic file.
Read it first and in full, before `tickets.py next` or `status` and before any file but the item's reference.
Its `sources:` were distilled into it; open a companion only when the step needs it.
A start request is exempt from the full read: `find` the ticket, confirm it is unassigned, and hand it to the builder, who reads it.
