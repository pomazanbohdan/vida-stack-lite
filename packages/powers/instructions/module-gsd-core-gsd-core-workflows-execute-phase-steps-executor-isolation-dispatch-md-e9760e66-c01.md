---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-executor-isolation-dispatch-md-e9760e66-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md\"}"
atom_ids:
  - gate-the-dispatch-on-the-per-item-decision
  - let-the-artifacts-decide-not-the-exit-code
  - never-dispatch-a-prompt-that-still-holds-a-placeholder
  - never-guess-when-a-capability-cannot-be-verified
  - one-owner-writes-the-shared-state
  - reconcile-a-recorded-worker-from-its-record
  - record-the-launch-before-you-wait
  - tear-down-the-side-effect-when-the-next-step-fails
atom_count: 8
atoms: "[{\"atom_id\":\"gate-the-dispatch-on-the-per-item-decision\",\"file_sha256\":\"e711b8af41c8bc94863ff0e12bc0eea79715f535233839ae20463aa93838e14b\",\"content_sha256\":\"4ef2dbdd508b294fc72ddc548a5394fa8978acd0811b369fb85509f403e3042c\",\"file_bytes\":1815,\"body_bytes\":491},{\"atom_id\":\"let-the-artifacts-decide-not-the-exit-code\",\"file_sha256\":\"7b71cb1711f22d492e254472bdac710a1099518c5ac2ea704c1dcbe70632777d\",\"content_sha256\":\"43be1c9973f04e174ed31244f3f82bb2507ab2471635ec1c0f570a69fb20a0ec\",\"file_bytes\":1797,\"body_bytes\":560},{\"atom_id\":\"never-dispatch-a-prompt-that-still-holds-a-placeholder\",\"file_sha256\":\"0386abf81bfa5b14010ccc429f72593ad7260206fc5fc283d5ba06d56753e6b5\",\"content_sha256\":\"306d531e04672735bb018a48108d4f672cc164a0cc7042f68f4a01ce3a02d4d5\",\"file_bytes\":1800,\"body_bytes\":404},{\"atom_id\":\"never-guess-when-a-capability-cannot-be-verified\",\"file_sha256\":\"eb1778627d62ab2e48c0f66a01ff311f9f034de3766ac030b92f3bb621da8458\",\"content_sha256\":\"86d92797c00a6df4b23291b941e7b510c379ce22e033487c6c82b6dfdfb2a01e\",\"file_bytes\":2101,\"body_bytes\":423},{\"atom_id\":\"one-owner-writes-the-shared-state\",\"file_sha256\":\"c1bad7c8a29492961b85beeb0a0b3815b8fec576d98f603735bd514905cf82d6\",\"content_sha256\":\"f5e4c550cae8cdd030551880ec8a4246d27b98c65cf2a7c03ad9e86048bd947a\",\"file_bytes\":1859,\"body_bytes\":405},{\"atom_id\":\"reconcile-a-recorded-worker-from-its-record\",\"file_sha256\":\"91c3549069ce1849d15f8716aa1f24b62f3937f255714494d5863bd66368a988\",\"content_sha256\":\"cac8810b1afd1266f9c763e33a0fcd630ced1403c2f0c296a3cdbd67ef6b62b9\",\"file_bytes\":1581,\"body_bytes\":325},{\"atom_id\":\"record-the-launch-before-you-wait\",\"file_sha256\":\"d408500593cf53b1380331103a69200fe1250f733868013f95dd6ff6b9f81e18\",\"content_sha256\":\"91dd4e781a851112179be3fdd2810978f3e981ed91c80e8d2493be81382f1266\",\"file_bytes\":1477,\"body_bytes\":375},{\"atom_id\":\"tear-down-the-side-effect-when-the-next-step-fails\",\"file_sha256\":\"2cfb06be839e9a7c1ed9a6e21c9f5aa2e2532f802822846db3a64e06370b76e0\",\"content_sha256\":\"e342531c21dea32f3fb2746684f3496bf4fbfbebdd0ab603e7bdf2826421bf16\",\"file_bytes\":1686,\"body_bytes\":418}]"
carrier_sha256: 0fa53ee5b7774a505112f4862370c8ffed2b9603b8d151d73c25e86ec53778ba
carrier_bytes: 15269
revision: 1
status: active
---
<!-- vpmodule:atom:begin gate-the-dispatch-on-the-per-item-decision -->
---
instruction_id: gate-the-dispatch-on-the-per-item-decision
title: Gate the dispatch on the per-item decision
summary: "The isolation decision is taken per item of the batch and the dispatch gates on that decision, not on the project default."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A batch of items is dispatched and some of them may not be able to run isolated.
conditions_does_not_apply_when: The whole batch shares one decision.
artifact_contract_output_type: per-item-isolation-decision
artifact_contract_required_data:
  - the decision for the item being dispatched
  - the reason for it
  - the items that were kept isolated
artifact_contract_verified_by: the dispatch of each item followed its own decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/per-plan-worktree-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the dispatch on the per-item decision
gates the dispatch branch (worktree mode vs sequential mode) for that plan only — other plans in the same wave can still take the worktree path.
for the current plan, not on the project-level `USE_WORKTREES`
planned paths are unknown/unparseable - fall back to the safe
behavior (disable worktree isolation for this plan) and log why.
A path outside the declared scope is reported in the result's `warnings` array; it does not block the merge.
<!-- vpmodule:atom:end gate-the-dispatch-on-the-per-item-decision -->
<!-- vpmodule:atom:begin let-the-artifacts-decide-not-the-exit-code -->
---
instruction_id: let-the-artifacts-decide-not-the-exit-code
title: "Let the artifacts decide, not the exit code"
summary: "The produced artefacts and the recorded commits decide whether a worker is done; a zero exit without artefacts is not done, and a non-zero exit with complete artefacts may still merge."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A delegated worker has reached a terminal state and its outcome must be decided.
conditions_does_not_apply_when: The worker produced no artefact and no commit at all.
artifact_contract_output_type: worker-outcome-verdict
artifact_contract_required_data:
  - the artefacts found
  - the commits found
  - the outcome decision
artifact_contract_verified_by: "the outcome follows the artefacts and the commits, not the process exit code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Let the artifacts decide, not the exit code
SUMMARY + plan-scoped commits + branch state decide the outcome: a worker that exits 0 with no artifacts is not done, and one that exits non-zero with artifacts complete may still merge.
Only then record the terminal outcome
While a worker's record is `running`, it is a reconciliation candidate the moment its process dies — a crash between classification and recording can never strand it.
Merge artifact-complete workers through the manifest-only gauntlet below; preserve a blocked/failed worktree untouched.
<!-- vpmodule:atom:end let-the-artifacts-decide-not-the-exit-code -->
<!-- vpmodule:atom:begin never-dispatch-a-prompt-that-still-holds-a-placeholder -->
---
instruction_id: never-dispatch-a-prompt-that-still-holds-a-placeholder
title: Never dispatch a prompt that still holds a placeholder
summary: "Before a prompt leaves, every conditional in it is resolved to concrete text; a prompt that still holds template syntax is a halt, not a dispatch."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - verification-before-completion
conditions_applies_when: A prompt is composed for a delegated worker or a spawned process.
conditions_does_not_apply_when: The prompt is a fixed template with nothing to substitute.
artifact_contract_output_type: prompt-resolution-check
artifact_contract_required_data:
  - the unresolved markers
  - the source that was unreadable
  - the halt reason
artifact_contract_verified_by: the dispatched prompt contains no unresolved marker and no un-substituted template syntax
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/tdd-applicability-resolution.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never dispatch a prompt that still holds a placeholder
Before calling Agent(), confirm every `${...}` conditional in the prompt below
If any marker's value was not computed, HALT — do not dispatch a prompt containing literal `${...}` template syntax
the resolution check after the assignment fails closed: if any embed source cannot be read, do NOT spawn a generic process and hope — halt the wave
<!-- vpmodule:atom:end never-dispatch-a-prompt-that-still-holds-a-placeholder -->
<!-- vpmodule:atom:begin never-guess-when-a-capability-cannot-be-verified -->
---
instruction_id: never-guess-when-a-capability-cannot-be-verified
title: Never guess when a capability cannot be verified
summary: "A capability that cannot be resolved is never guessed: the resolver fails closed, the failure is kept apart from a genuine \"none\", and the run halts rather than answering \"safe\"."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
  - halt-on-missing-precondition
conditions_applies_when: "A capability, isolation mode or procedure selection must be resolved before the work starts."
conditions_does_not_apply_when: The capability is resolved and the answer is unambiguous.
artifact_contract_output_type: capability-resolution
artifact_contract_required_data:
  - the capability asked for
  - the answer or the reason it could not be answered
  - the branch taken
artifact_contract_verified_by: "the branch taken follows an answered question, and an unanswered question is reported as unanswered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/per-plan-executor-routing.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/tdd-applicability-resolution.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never guess when a capability cannot be verified
Refusing to dispatch rather than guess (a guard that cannot verify must not answer 'safe').
Resolves whether this dispatch is TDD — fail closed, do not guess.
Refusing to guess whether this dispatch needs the TDD procedure.
fails closed to the default executor when the named agent does not resolve or on any error, so a missing or misspelled hint never blocks dispatch
<!-- vpmodule:atom:end never-guess-when-a-capability-cannot-be-verified -->
<!-- vpmodule:atom:begin one-owner-writes-the-shared-state -->
---
instruction_id: one-owner-writes-the-shared-state
title: One owner writes the shared state
summary: In a parallel run the worker edits and commits only inside its own workspace; the owner of the run performs every merge and writes the shared state files.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several units run in parallel and write into shared artefacts.
conditions_does_not_apply_when: A single unit runs alone in the main checkout.
artifact_contract_output_type: ownership-split
artifact_contract_required_data:
  - the owner of the shared state
  - what the workers may write
  - what the owner performs
artifact_contract_verified_by: no worker wrote a shared state file and every merge was performed by the owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/worktree-recovery-policy.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# One owner writes the shared state
the orchestrator performs every git operation — create, merge, cleanup; the spawned executor only edits files and commits inside its own worktree.
The orchestrator — the worktree lifecycle owner — performs any base correction
The executor never touches `STATE.md`/`ROADMAP.md`, and that guard needs no new code
the orchestrator owns the post-merge sync centrally
<!-- vpmodule:atom:end one-owner-writes-the-shared-state -->
<!-- vpmodule:atom:begin reconcile-a-recorded-worker-from-its-record -->
---
instruction_id: reconcile-a-recorded-worker-from-its-record
title: Reconcile a recorded worker from its record
summary: "A worker that a previous session left behind is reconciled from its persisted record — never re-dispatched, never reconciled on narration alone."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A previous session left a worker behind and the run continues.
conditions_does_not_apply_when: No worker was ever recorded.
artifact_contract_output_type: worker-reconciliation
artifact_contract_required_data:
  - the recorded worker
  - the persisted record
  - the reconciliation outcome
artifact_contract_verified_by: the recorded worker was reconciled from its record and was not dispatched a second time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The frozen body ends after a colon that introduces an omitted worker-sweep sequence; the exact operative form is incomplete.
---

# Reconcile a recorded worker from its record
Never re-dispatch a recorded plan, and never reconcile on narration alone.
The launching turn may end while external workers are still live — that is expected here, not an error.
So before dispatching ANY plan in this section, sweep for workers a previous session left behind:
<!-- vpmodule:atom:end reconcile-a-recorded-worker-from-its-record -->
<!-- vpmodule:atom:begin record-the-launch-before-you-wait -->
---
instruction_id: record-the-launch-before-you-wait
title: Record the launch before you wait
summary: The launch identity and the place the result will land are written down right after the spawn and before any wait.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A worker is started in the background and the run may end before it returns.
conditions_does_not_apply_when: The call returns inline and the result is already in hand.
artifact_contract_output_type: worker-launch-record
artifact_contract_required_data:
  - the launch identity
  - the result location
  - the worker process identity
artifact_contract_verified_by: the record exists before the wait starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the launch before you wait
A bare background `wait` left the wave with no durable lifecycle
when the orchestrator's turn ended first, a finished worker sat undiscovered and a blocked one sat unreported, and a resumed session had nothing to recover from.
Immediately after the spawn — before waiting on anything — persist the launch identity and result location:
<!-- vpmodule:atom:end record-the-launch-before-you-wait -->
<!-- vpmodule:atom:begin tear-down-the-side-effect-when-the-next-step-fails -->
---
instruction_id: tear-down-the-side-effect-when-the-next-step-fails
title: Tear down the side effect when the next step fails
summary: "When a step already created something and the step after it fails, the created thing is torn down and the run halts — it is never left behind as an orphan."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A step has already produced a side effect and the following step turns out to be unusable.
conditions_does_not_apply_when: "No side effect exists yet, or the following step succeeded."
artifact_contract_output_type: partial-step-rollback
artifact_contract_required_data:
  - the side effect created
  - the reason the next step failed
  - the teardown performed
artifact_contract_verified_by: no side effect of the failed step survives and the run halted instead of continuing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tear down the side effect when the next step fails
Fail-closed is the invariant: an undeclared, unknown, or unresolvable isolation declaration degrades to `none`, never to an unsafe parallel path.
A `harness-worktree` host with no declared flag, and an `orchestrator-worktree` host whose exec descriptor does not resolve, both degrade to `none` rather than dispatching executors that only believe they are isolated.
<!-- vpmodule:atom:end tear-down-the-side-effect-when-the-next-step-fails -->