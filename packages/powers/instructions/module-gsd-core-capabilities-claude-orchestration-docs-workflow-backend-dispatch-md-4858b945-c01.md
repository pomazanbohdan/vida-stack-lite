---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-capabilities-claude-orchestration-docs-workflow-backend-dispatch-md-4858b945-c01"
title: "gsd-core: capabilities/claude-orchestration/docs/workflow-backend-dispatch.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:capabilities/claude-orchestration/docs/workflow-backend-dispatch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"capabilities/claude-orchestration/docs/workflow-backend-dispatch.md\"}"
atom_ids:
  - carry-the-same-brief-in-every-execution-path
  - degrade-the-whole-capability-never-part-of-it
  - halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record
  - keep-orchestrator-procedure-out-of-the-executor-prompt
atom_count: 4
atoms: "[{\"atom_id\":\"carry-the-same-brief-in-every-execution-path\",\"file_sha256\":\"025d939002977bfa77aaae9cb8270962fac6e9a9f9d3991fd79aa28e663475b5\",\"content_sha256\":\"66299629a4851d0c2fb13fa867bd2ca30a77d7ec990471d356e71d9ec7e9ec5f\",\"file_bytes\":1390,\"body_bytes\":247},{\"atom_id\":\"degrade-the-whole-capability-never-part-of-it\",\"file_sha256\":\"84450b8ad6867ee73386f295d87c2e08c5818ef9f0fba08a999a511a911d1127\",\"content_sha256\":\"73007cdb9b968b0d6c7bef6c0e5b2c92bc3dae29410a102c9e27ae775841be1e\",\"file_bytes\":2185,\"body_bytes\":672},{\"atom_id\":\"halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record\",\"file_sha256\":\"583cd756232de49f2a2e76d3c5d51e65251ba566d8354fcc09b5cb7636bf227e\",\"content_sha256\":\"7139b52d855fe0de1db9f9eeaf219796de0114dddeb77825ca1400c5a9c2c1f4\",\"file_bytes\":1805,\"body_bytes\":625},{\"atom_id\":\"keep-orchestrator-procedure-out-of-the-executor-prompt\",\"file_sha256\":\"b605fea491b01ce2f5545b082e4dde7e43117ffdbd05f5c8b637b0d19859fc78\",\"content_sha256\":\"92d83edf91039a39e0c4618e86a94c0d45bf7c10ecec3f3b08800a7e9744ce53\",\"file_bytes\":2065,\"body_bytes\":547}]"
carrier_sha256: 45950b1f4dd8d44c0496fc06fe75d955218df69260aaffc318a89111e7dd306e
carrier_bytes: 8096
revision: 1
status: active
---
<!-- vpmodule:atom:begin carry-the-same-brief-in-every-execution-path -->
---
instruction_id: carry-the-same-brief-in-every-execution-path
title: Carry the same brief in every execution path
summary: "When work is dispatched by a different mechanism, the brief carries the same content as the direct path; a summary of it does not reproduce the behaviour."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A second dispatch path is being wired for work that already has a brief.
conditions_does_not_apply_when: The work has only one dispatch path.
artifact_contract_output_type: dispatch-brief
artifact_contract_required_data:
  - the brief content
  - the path that carries it
  - what a summary would lose
artifact_contract_verified_by: both paths dispatch the same brief content
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Carry the same brief in every execution path
- **brief** — MUST carry the same task content as step 3's inline `Agent()` prompt
- a short summary here would NOT reproduce step 3's behavior and would violate the "identical artifacts" contract.
<!-- vpmodule:atom:end carry-the-same-brief-in-every-execution-path -->
<!-- vpmodule:atom:begin degrade-the-whole-capability-never-part-of-it -->
---
instruction_id: degrade-the-whole-capability-never-part-of-it
title: "Degrade the whole capability, never part of it"
summary: "When a detection gate of an optional capability misses, the capability is off in full and the standard path runs unchanged; it never half-activates."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: An optional capability is being enabled and one of its activation checks does not pass.
conditions_does_not_apply_when: No optional capability is involved in the step.
artifact_contract_output_type: activation-decision
artifact_contract_required_data:
  - the gate that did not pass
  - the path that runs instead
  - what the caller may not assume
artifact_contract_verified_by: the standard path runs unmodified and the capability contributes nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/claude-orchestration/fragments/plan-post.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade the whole capability, never part of it
- The Workflow backend never partially activates; the executor MUST NOT assume parallelism, a shared budget, or resume-from-run-id semantics when `backend == "inline"`.
- Detection is fail-closed end-to-end: capability disabled, non-Claude runtime, `execution_backend:"inline"`, missing/incapable host descriptor, unknown or below-floor Agent SDK version, or an `emitWorkflowScript` failure on a malformed wave manifest — ANY of these degrades to `backend:"inline"` and execute-phase's standard inline dispatch (step 3) runs unmodified.
- This is advisory, not mandatory — the stable local planner remains the default.
<!-- vpmodule:atom:end degrade-the-whole-capability-never-part-of-it -->
<!-- vpmodule:atom:begin halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record -->
---
instruction_id: halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record
title: Halt and name the recovery instead of proceeding on an empty record
summary: "When the bookkeeping of a run is short of what it must contain, the run stops with the failing item and the recovery named; it never continues on an empty record."
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: "A run's record is missing an entry that the run needs."
conditions_does_not_apply_when: The record is complete.
artifact_contract_output_type: halt-record
artifact_contract_required_data:
  - the failing item
  - the recovery to apply
  - what is deliberately not done
artifact_contract_verified_by: the run stopped with the failing item and the recovery named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Halt and name the recovery instead of proceeding on an empty record
- STOP the phase with the failing plan id and the recovery hint below; do NOT run `worktree.cleanup-wave` and do NOT proceed to step 4.
- Recover the missing metadata from the run's per-agent result journal (`journal.jsonl` — one `{"type":"result",…}` line per agent — in the Workflow run's transcript dir), re-run `worktree.record-agent` by hand, then re-run cleanup. If the journal cannot be recovered either, merge the branch manually after review — never discard it.
- a resumed run must never report success over silently-dropped agent work.
<!-- vpmodule:atom:end halt-and-name-the-recovery-instead-of-proceeding-on-an-empty-record -->
<!-- vpmodule:atom:begin keep-orchestrator-procedure-out-of-the-executor-prompt -->
---
instruction_id: keep-orchestrator-procedure-out-of-the-executor-prompt
title: Keep orchestrator procedure out of the executor prompt
summary: Procedure that belongs to the coordinator is never injected into the prompt of the role that executes; the two roles keep their own responsibilities.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: "A fragment of procedure is about to be added to another role's prompt."
conditions_does_not_apply_when: "The fragment is genuinely about the receiving role's own work."
artifact_contract_output_type: role-boundary
artifact_contract_required_data:
  - the role that owns the procedure
  - the role the fragment was about to enter
  - the reason the split holds
artifact_contract_verified_by: "no orchestrator procedure reaches the executor's prompt"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=capabilities/claude-orchestration/docs/workflow-backend-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/multi-agent-orchestration.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/claude-orchestration-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep orchestrator procedure out of the executor prompt
- Injecting orchestrator instructions into executor prompts violates the loop's role partition (the orchestrator orchestrates, the executor executes), so the contribution was removed ([#4740]).
- The orchestrator is deliberately thin. It does not reason about the domain, does not write code, and does not interpret results beyond routing them to the next step.
- That boundary keeps each layer's responsibility clear and prevents the orchestrator's context from accumulating domain noise.
<!-- vpmodule:atom:end keep-orchestrator-procedure-out-of-the-executor-prompt -->