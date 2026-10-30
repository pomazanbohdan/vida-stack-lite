---
instruction_id: give-an-agent-only-the-tools-its-role-needs
title: Give an agent only the tools its role needs
summary: "An agent that only reads files and writes one document gets exactly those capabilities, so the blast radius of an unexpected behaviour stays small."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - control-tiering
conditions_applies_when: A role is defined and its capability surface is being set.
conditions_does_not_apply_when: The role needs every capability the host offers.
artifact_contract_output_type: role-capability-surface
artifact_contract_required_data:
  - the capabilities the role is given
  - the capabilities it is denied
  - the blast radius that follows
artifact_contract_verified_by: the role carries only the capabilities its work needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give an agent only the tools its role needs
- An agent that only needs to read files and write a single output document gets exactly those permissions — no Bash execution, no access to broader state.
- That constraint is intentional: it keeps the blast radius small if an agent behaves unexpectedly.
