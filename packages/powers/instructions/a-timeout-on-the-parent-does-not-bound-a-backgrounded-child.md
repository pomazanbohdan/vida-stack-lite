---
instruction_id: a-timeout-on-the-parent-does-not-bound-a-backgrounded-child
title: A timeout on the parent does not bound a backgrounded child
summary: A timeout that kills the parent process leaves a backgrounded child running; the command has to stay in the foreground or manage its own children.
capability_tags:
  - harden-validation
pattern_tags:
  - resource-bounds
conditions_applies_when: A command is run under a time limit and may start a child of its own.
conditions_does_not_apply_when: The command runs everything in the foreground.
artifact_contract_output_type: bounded-command
artifact_contract_required_data:
  - the command
  - the timeout
  - how the children are managed
artifact_contract_verified_by: the command stays in the foreground or self-manages its children
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/command-exit-zero-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# A timeout on the parent does not bound a backgrounded child
Backgrounded children escape the timeout. `command: "sleep 100 &"` returns before the sleep finishes; the timeout kills the `sh` parent, not the backgrounded child. Keep your command foreground, or have it self-manage its children.
