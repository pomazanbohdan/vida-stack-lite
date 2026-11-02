---
instruction_id: keep-each-container-s-breakdown-in-its-tickets-folder
title: Keep each container's breakdown in its tickets folder
summary: "A container keeps its own file, memlog and companions at the top of its folder, and its breakdown in a `tickets/` folder inside it."
capability_tags:
  - coordinate-program
pattern_tags:
  - implementation-planning
  - stable-identity
conditions_applies_when: A ticket tree is created, read or migrated.
conditions_does_not_apply_when: The tree is a flat list with no containers.
artifact_contract_output_type: ticket-tree-layout
artifact_contract_required_data:
  - each container's own files
  - the `tickets/` folder and what it holds
  - the backlog location
artifact_contract_verified_by: every breakdown sits in its container's `tickets/` folder and every standalone leaf in `backlog/`
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

# Keep each container's breakdown in its tickets folder
An initiative or epic keeps its own file, `.memlog.md`, other skills' run folders and its retrospective at the top of its folder, and its breakdown in a `tickets/` folder inside it.
An initiative's `tickets.toml` lists child initiatives, epics, or entries, one kind only.
An epic's `tickets/` holds its `tickets.toml`, leaf files and plans.
A standalone leaf lives in `{output_folder}/backlog/` beside its plan.
A tree from the earlier layout, with `tickets.toml` and epic folders directly in the initiative folder, makes `tickets.py` stop: run `bmad migrate method`.
