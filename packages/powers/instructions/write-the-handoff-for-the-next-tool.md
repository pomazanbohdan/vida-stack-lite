---
instruction_id: write-the-handoff-for-the-next-tool
title: Write the handoff for the next tool
summary: "The handoff carries the chosen and critical discoveries only, structured to drop straight into the next tool, with none of the report bloat."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A session ends and its result has to be handed to another tool.
conditions_does_not_apply_when: No downstream tool is going to read the result.
artifact_contract_output_type: handoff-document
artifact_contract_required_data:
  - the chosen discoveries
  - the critical ones
  - the points that matter downstream
artifact_contract_verified_by: the document holds only the discoveries that matter downstream and nothing of the report bloat
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-brainstorming/references/finalize.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Write the handoff for the next tool
The chosen and critical discoveries only, structured to drop straight into a downstream skill as clean input, with none of the report's bloat - token usage matters and it must really be on point.
When the next step is requirements, the downstream skill is Sofia (`bmad-agent-po`): hand her the intent and the decisions, not a rewritten brief.
Confirm what the user wants to capture as the intent from the overall findings as there may be many divergent discoveries
