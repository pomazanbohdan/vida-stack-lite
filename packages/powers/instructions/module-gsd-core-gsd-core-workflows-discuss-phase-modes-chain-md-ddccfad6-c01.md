---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-discuss-phase-modes-chain-md-ddccfad6-c01"
title: "gsd-core: gsd-core/workflows/discuss-phase/modes/chain.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/discuss-phase/modes/chain.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/discuss-phase/modes/chain.md\"}"
atom_ids:
  - clear-the-ephemeral-auto-flag-when-the-user-invokes-manually
  - keep-the-orchestration-chain-flat
atom_count: 2
atoms: "[{\"atom_id\":\"clear-the-ephemeral-auto-flag-when-the-user-invokes-manually\",\"file_sha256\":\"6d5a0f53e11b0820cc707efff93bd8861025aa02da3115f87305f40732c0c852\",\"content_sha256\":\"59adb9e19dc24c35fa9a6b61299d6c84db1dbea359e0f3142ebc4055a6a5e6a7\",\"file_bytes\":1504,\"body_bytes\":285},{\"atom_id\":\"keep-the-orchestration-chain-flat\",\"file_sha256\":\"8542b8c90fc28672e1b6cc2add3cbab4aee44b821e5e0c10a96ceef35020ba76\",\"content_sha256\":\"57673ae78a31d37453ad2793e3353a034f9f32688f0a33995381e02a43062046\",\"file_bytes\":1276,\"body_bytes\":192}]"
carrier_sha256: 382538fafa2cb1ce93e1c9adf3b64ea8df7a6f99bbafa0019cc9eeb15a7243ab
carrier_bytes: 3081
revision: 1
status: active
---
<!-- vpmodule:atom:begin clear-the-ephemeral-auto-flag-when-the-user-invokes-manually -->
---
instruction_id: clear-the-ephemeral-auto-flag-when-the-user-invokes-manually
title: Clear the ephemeral auto flag when the user invokes manually
summary: An interrupted automatic run leaves no stale flag behind when the user comes back by hand.
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - unattended-execution
conditions_applies_when: The user invoked the run by hand after an earlier automatic run was interrupted.
conditions_does_not_apply_when: The user asked for the automatic run.
artifact_contract_output_type: run-mode
artifact_contract_required_data:
  - the invocation that was detected
artifact_contract_verified_by: the ephemeral flag of the interrupted run is cleared and the persistent preference is untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/chain.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Clear the ephemeral auto flag when the user invokes manually
if user invoked manually (no `--auto` and no `--chain`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference)
<!-- vpmodule:atom:end clear-the-ephemeral-auto-flag-when-the-user-invokes-manually -->
<!-- vpmodule:atom:begin keep-the-orchestration-chain-flat -->
---
instruction_id: keep-the-orchestration-chain-flat
title: Keep the orchestration chain flat
summary: The steps of a chain run at the same nesting level instead of nesting deeper and deeper.
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A chain of steps is about to hand over to the next step automatically.
conditions_does_not_apply_when: Only one step runs.
artifact_contract_output_type: chain-plan
artifact_contract_required_data:
  - the steps of the chain
artifact_contract_verified_by: the steps of the chain run at the same nesting level
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase/modes/chain.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the orchestration chain flat
This keeps the auto-advance chain flat — discuss, plan, and execute all run at the same nesting level rather than spawning increasingly deep Task agents.
<!-- vpmodule:atom:end keep-the-orchestration-chain-flat -->