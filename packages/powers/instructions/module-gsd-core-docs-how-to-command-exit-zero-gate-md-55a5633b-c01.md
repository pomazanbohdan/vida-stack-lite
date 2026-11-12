---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-command-exit-zero-gate-md-55a5633b-c01"
title: "gsd-core: docs/how-to/command-exit-zero-gate.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/command-exit-zero-gate.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/command-exit-zero-gate.md\"}"
atom_ids:
  - a-timeout-on-the-parent-does-not-bound-a-backgrounded-child
  - the-diagnostic-must-fit-inside-the-message
atom_count: 2
atoms: "[{\"atom_id\":\"a-timeout-on-the-parent-does-not-bound-a-backgrounded-child\",\"file_sha256\":\"db72749d8781aa67996d187cbd36d7942546be4a96beb6072a4f7e0035434bee\",\"content_sha256\":\"a1d1c446c60cc684626444109859e56c6c075fba3a9c0829d2f4b8abb4f149ee\",\"file_bytes\":1443,\"body_bytes\":294},{\"atom_id\":\"the-diagnostic-must-fit-inside-the-message\",\"file_sha256\":\"4cbc1a7165b0a6d7fa79a895a7a3450aa837ce4cf90eb57118837f6f48e63c39\",\"content_sha256\":\"2a61cf386022410ca7a89eb8b0bc8ecf48f98959f0c060a9f453233fb10df3af\",\"file_bytes\":1329,\"body_bytes\":192}]"
carrier_sha256: 0dbf02fcd0f7182d35ff92ce14b5d793fc1427a6c4ba80195bce74bf1d0f5fd0
carrier_bytes: 3089
revision: 1
status: active
---
<!-- vpmodule:atom:begin a-timeout-on-the-parent-does-not-bound-a-backgrounded-child -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/command-exit-zero-gate.md
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
<!-- vpmodule:atom:end a-timeout-on-the-parent-does-not-bound-a-backgrounded-child -->
<!-- vpmodule:atom:begin the-diagnostic-must-fit-inside-the-message -->
---
instruction_id: the-diagnostic-must-fit-inside-the-message
title: The diagnostic must fit inside the message
summary: "A check surfaces only the tail of its output, so the diagnostic it writes has to be concise; nothing downstream may grep the long output instead."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A check reports its result as a message that carries the tail of the command output.
conditions_does_not_apply_when: The whole output is written to a file the reader opens.
artifact_contract_output_type: check-message
artifact_contract_required_data:
  - the concise diagnostic
  - the surface the message carries
artifact_contract_verified_by: the diagnostic stands on its own inside the message without the full output
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/command-exit-zero-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# The diagnostic must fit inside the message
Only the last 2000 chars of stderr/stdout surface in the gate `message`. Emit a concise diagnostic; don't rely on grepping long output downstream.
<!-- vpmodule:atom:end the-diagnostic-must-fit-inside-the-message -->