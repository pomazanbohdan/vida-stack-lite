---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-references-planner-human-verify-mode-md-51a5b369-c01"
title: "gsd-core: gsd-core/references/planner-human-verify-mode.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/references/planner-human-verify-mode.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/references/planner-human-verify-mode.md\"}"
atom_ids:
  - do-not-defer-evidence-the-harvest-does-not-cover
  - fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end
atom_count: 2
atoms: "[{\"atom_id\":\"do-not-defer-evidence-the-harvest-does-not-cover\",\"file_sha256\":\"684a9bdd1c7f119df006bde0821923884ff1c0201a46ee51a9c1c1cd1d392a4b\",\"content_sha256\":\"4acee85e0a41d6589968da01dc3e034ac0569691ada7c4fc825b7d6b970daf79\",\"file_bytes\":1981,\"body_bytes\":868},{\"atom_id\":\"fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end\",\"file_sha256\":\"928bb7e769d481f2e9e13a071f3aa57f7028f55bec30841a698b4cd49dba0954\",\"content_sha256\":\"da4abc7dffa08b33599e4a7ce9ebfc463f33f13d1d15d6de7d07b685c2bb18c1\",\"file_bytes\":2311,\"body_bytes\":1091}]"
carrier_sha256: 5fc9140fa54d9abba13d946a33ed81741072e55f803d9cc4e479bd9325942394
carrier_bytes: 4639
revision: 1
status: active
---
<!-- vpmodule:atom:begin do-not-defer-evidence-the-harvest-does-not-cover -->
---
instruction_id: do-not-defer-evidence-the-harvest-does-not-cover
title: Do not defer evidence the harvest does not cover
summary: A human observation that the end-of-phase harvest never collects is not deferred to the end; it halts where it is produced.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A mode would defer a piece of human evidence to the end of the phase.
conditions_does_not_apply_when: The end-of-phase harvest covers that evidence.
artifact_contract_output_type: evidence-disposition
artifact_contract_required_data:
  - the evidence
  - the harvest that covers it or does not
artifact_contract_verified_by: no evidence is deferred to a collector that does not read it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-human-verify-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not defer evidence the harvest does not cover
**the end-of-phase harvest does not cover tracers.** `agents/gsd-verifier.md` collects `<verify><human-check>` blocks from `auto` tasks; deferring a tracer's human evidence without first widening that seam would drop the evidence on the floor entirely — strictly worse than halting
Second, the tracer gate exists to stop expansion being layered onto an unproven slice; deferring its human evidence would let every expansion task build on a slice no human has confirmed, the exact failure the gate was introduced to prevent
Third, the reported defect is scoped to tracers with *no* human-observable evidence, and fail-closed is the safe direction outside that scope. If uniformity is later preferred, the harvest must be widened to tracers in the same change — record that decision here rather than re-deriving it
<!-- vpmodule:atom:end do-not-defer-evidence-the-harvest-does-not-cover -->
<!-- vpmodule:atom:begin fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end -->
---
instruction_id: fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end
title: Fold mid-flight verification into the task and harvest it at the end
summary: "A would-be mid-flight verification becomes a human-check inside the task, and the verifier collects all of them into one end-of-phase batch."
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The human-verification mode is the end-of-phase one.
conditions_does_not_apply_when: "The mode is the mid-flight one, or the task needs a human decision before the next task runs."
artifact_contract_output_type: human-check-block
artifact_contract_required_data:
  - the human-check block
  - the test to perform
  - the expected result
artifact_contract_verified_by: no mid-flight verification task is emitted and the human check sits inside the task
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-human-verify-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Fold mid-flight verification into the task and harvest it at the end
Do **not** emit any `<task type="checkpoint:human-verify">` tasks. Every mid-flight halt costs a full executor cold-start (CLAUDE.md, MEMORY.md, STATE.md, plan re-read on respawn) because subagent context is discarded across the pause; a plan with N human-verify checkpoints pays the cold-start cost N+1 times
Instead, fold each would-be verification step into the relevant `auto` task using a `<verify><human-check>` sub-block
The verifier (Step 8) harvests every `<verify><human-check>` block at end-of-phase and consolidates them into the existing `human_needed` → `{phase_num}-UAT.md` path in `workflows/execute-phase.md`. The user reviews everything in one batch instead of paying a cold-start cost per item
`checkpoint:decision` and `checkpoint:human-action` tasks are still emitted in `end-of-phase` mode. Those gate the work itself (a choice the executor needs from the user, or an auth step only the user can perform), not post-hoc verification of completed work. Only `checkpoint:human-verify` is suppressed
<!-- vpmodule:atom:end fold-mid-flight-verification-into-the-task-and-harvest-it-at-the-end -->