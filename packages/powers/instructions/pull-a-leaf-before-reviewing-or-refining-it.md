---
instruction_id: pull-a-leaf-before-reviewing-or-refining-it
title: Pull a leaf before reviewing or refining it
summary: "A leaf with no story file is pulled first; `pull` writes a fixed layout, not the template, and a done or dropped ticket is left as it is."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
  - progressive-disclosure
conditions_applies_when: A leaf is reviewed, refined, or published and `find` gives a null `story_file`.
conditions_does_not_apply_when: The leaf already has its file.
artifact_contract_output_type: pulled-leaf
artifact_contract_required_data:
  - the leaf id
  - the pulled file
artifact_contract_verified_by: the fixed-layout file exists and the done or dropped record was not reshaped
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
status: active
revision: 1
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Pull a leaf before reviewing or refining it
A leaf with no file (`find` gives `story_file` null) is pulled first: `tickets.py pull <epic folder> <id>` writes a fixed layout, not the template.
Review and refine the pulled file.
A done or dropped ticket and its plan are the record: never reshape them to a newer template.
