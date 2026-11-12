---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-manager-md-aa1e5d63-c01"
title: "gsd-core: gsd-core/workflows/manager.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/manager.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/manager.md\"}"
atom_ids:
  - background-only-where-the-host-can-nest-the-gates
  - present-the-fewest-options-and-list-every-action
  - re-read-the-state-from-disk-at-every-refresh
atom_count: 3
atoms: "[{\"atom_id\":\"background-only-where-the-host-can-nest-the-gates\",\"file_sha256\":\"c2e3c3edaf38af21e4d4602c3cb8ec9d6f06d8c92afd9182ca74d68d3d736d7f\",\"content_sha256\":\"6a7550ea095fe5e9455b48a6e170b3dae00e9f19d57ca2d747195ebab375bf58\",\"file_bytes\":1702,\"body_bytes\":524},{\"atom_id\":\"present-the-fewest-options-and-list-every-action\",\"file_sha256\":\"9f4f81c998e6cc41d552e8c6b95843980b486a77c269a3fb9fcee9de9548cb2c\",\"content_sha256\":\"a8ac4f6ad6c4cedcc1924365e85e848a57d0f60f400d5b4f0340a793f6ed82af\",\"file_bytes\":1338,\"body_bytes\":274},{\"atom_id\":\"re-read-the-state-from-disk-at-every-refresh\",\"file_sha256\":\"397e518c9c41849d620fb0bde321671456cb14720e4741fd8d2fbc353e17e45c\",\"content_sha256\":\"36ee219b6d03e1633b58da2ca90350c33c5b96409448a3f667ecd525b5d132bf\",\"file_bytes\":1458,\"body_bytes\":350}]"
carrier_sha256: bcc417849dbc8581e3461ed1a2d5005b18f6f4e717972d0b46efe532ebbdcae6
carrier_bytes: 4953
revision: 1
status: active
---
<!-- vpmodule:atom:begin background-only-where-the-host-can-nest-the-gates -->
---
instruction_id: background-only-where-the-host-can-nest-the-gates
title: Background only where the host can nest the gates
summary: A step is only handed to a background agent when a backgrounded agent there can still run the sub-agents the step depends on; otherwise it runs in the foreground so the gates actually run.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A step could be dispatched in the background or run in the foreground.
conditions_does_not_apply_when: The step has no sub-agents of its own.
artifact_contract_output_type: dispatch-mode-decision
artifact_contract_required_data:
  - whether a backgrounded agent can nest the sub-agents
  - the mode that was chosen
artifact_contract_verified_by: the background was used only where the nested gates could still run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Background only where the host can nest the gates
First resolve whether background dispatch is safe.
Background dispatch is only safe on a runtime where a backgrounded agent can still nest the pipeline's subagents
This is determined from the documentation-sourced dispatch capability in the registry
the background agents continue while you verify/discuss.
run the chosen plan/execute step(s) **inline** via their handlers below (in order), then run verification actions, then run the inline discuss.
There is no overlap.
<!-- vpmodule:atom:end background-only-where-the-host-can-nest-the-gates -->
<!-- vpmodule:atom:begin present-the-fewest-options-and-list-every-action -->
---
instruction_id: present-the-fewest-options-and-list-every-action
title: Present the fewest options and list every action
summary: The recommended actions are grouped into as few options as possible; one option may carry several actions and every action is listed.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: Several recommended actions are presented for a choice.
conditions_does_not_apply_when: There is one action and nothing to group.
artifact_contract_output_type: action-menu
artifact_contract_required_data:
  - the grouped options
  - every action each option dispatches
artifact_contract_verified_by: no recommended action is left out of the menu
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
  - operations
---

# Present the fewest options and list every action
The goal is to present the fewest options possible - one option can dispatch multiple background agents plus one inline action.
Enumerate ALL recommended actions - do not cap or truncate
Include every action, not just two.
<!-- vpmodule:atom:end present-the-fewest-options-and-list-every-action -->
<!-- vpmodule:atom:begin re-read-the-state-from-disk-at-every-refresh -->
---
instruction_id: re-read-the-state-from-disk-at-every-refresh
title: Re-read the state from disk at every refresh
summary: "Every time the status view is shown, the state is re-read from disk so that the changes made by the background agents are picked up."
capability_tags:
  - verify-work-results
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A status view is re-rendered while other agents may be changing the state.
conditions_does_not_apply_when: The view is rendered once from a state that cannot change under it.
artifact_contract_output_type: refreshed-status
artifact_contract_required_data:
  - the state read from disk
  - the changes it shows
artifact_contract_verified_by: the state was re-read from disk at the refresh point
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/manager.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Re-read the state from disk at every refresh
Every time this step is reached, re-read state from disk to pick up changes from background agents:
Dashboard auto-refreshes when background work is active.
Dashboard refreshes pick up changes from background agents via disk state
Background agent completion triggers notification and dashboard refresh
<!-- vpmodule:atom:end re-read-the-state-from-disk-at-every-refresh -->