---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-md-9a512c31-c02"
title: "gsd-core: gsd-core/workflows/execute-phase.md module"
summary: "Carrier for 8 atomic instructions from gsd-core:gsd-core/workflows/execute-phase.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase.md\"}"
atom_ids:
  - measure-stall-by-lack-of-progress-not-runtime
  - never-auto-approve-a-human-verification-gate
  - never-read-an-empty-selection-as-completion
  - present-a-checkpoint-with-what-is-awaited
  - prune-worktrees-with-safety-gates
  - reconcile-the-artifacts-before-you-classify-the-outcome
  - resume-at-the-first-step-that-is-missing
  - show-the-menu-once-per-plan-not-per-task
atom_count: 8
atoms: "[{\"atom_id\":\"measure-stall-by-lack-of-progress-not-runtime\",\"file_sha256\":\"4c00b65a60d1829bfbbe6bbb10ead72a3953c2455ddc6346b9659081d123d1e6\",\"content_sha256\":\"29f91946410f32a55ed15bc7ae4554b9f72223f93f8956e0081394d64b0346a6\",\"file_bytes\":1178,\"body_bytes\":117},{\"atom_id\":\"never-auto-approve-a-human-verification-gate\",\"file_sha256\":\"a00b00ea0acece0195a0c8a3138788a08c006c559867eb69f1e6f57e69ad9de3\",\"content_sha256\":\"0abb42e745dea05207608cf4be2e76abbea1a2cf345f683373939391c3d65843\",\"file_bytes\":1209,\"body_bytes\":195},{\"atom_id\":\"never-read-an-empty-selection-as-completion\",\"file_sha256\":\"91d9c2a61656ea286782b584d38cbca651999dc8d453b69d7322c846fa266e66\",\"content_sha256\":\"c3f84b9738d73f94ffcc882233a3f31ee1da8eea94d0478ccc46792e2688b976\",\"file_bytes\":1361,\"body_bytes\":373},{\"atom_id\":\"present-a-checkpoint-with-what-is-awaited\",\"file_sha256\":\"0d422fad6b0d5aeb75dba4f32c488ce687365e6c0a868c2bb8a1355f2f6cc572\",\"content_sha256\":\"099bb137a1dbed5c1d6c79518a9f18d65bc8defc6b12f30d65c1ae687eef6528\",\"file_bytes\":1333,\"body_bytes\":261},{\"atom_id\":\"prune-worktrees-with-safety-gates\",\"file_sha256\":\"74cfe53ed1918b80b67c7abc4c4f5543d8ba33be040f42cd15ec868427b63ad0\",\"content_sha256\":\"7e284580b255de34623d90f0cc239a8515e09dae1f3807178ffcdf55f44af41d\",\"file_bytes\":3164,\"body_bytes\":1802},{\"atom_id\":\"reconcile-the-artifacts-before-you-classify-the-outcome\",\"file_sha256\":\"c316753e1a3ac1a53dc878883e7c1afada2a4c721bfa34a76d4f48a4e5da5f3d\",\"content_sha256\":\"053468f3a8b6979c1304232d423a92c2f70adc0615201516dfe33074ddea9236\",\"file_bytes\":2024,\"body_bytes\":804},{\"atom_id\":\"resume-at-the-first-step-that-is-missing\",\"file_sha256\":\"793b39a9ec913322769f504570a19f9a012002038b5dda1ff7a2df7adafcae8b\",\"content_sha256\":\"1fea27283dcbdcb4a060d6d510e5228aec74accbd3f9787db623e181dc57bd54\",\"file_bytes\":1126,\"body_bytes\":96},{\"atom_id\":\"show-the-menu-once-per-plan-not-per-task\",\"file_sha256\":\"821e201a2b43bba76ac38a99eea4326be66874e71ed5d437140de8c04fcfc311\",\"content_sha256\":\"8a6e6b97735b7294e44c68d57e0eea2da179906f9fd401da57c97412e5eee343\",\"file_bytes\":1647,\"body_bytes\":495}]"
carrier_sha256: cd190ec0a9a18defe75a24ce2695c69f2d489c050cd3d095adc626285664129d
carrier_bytes: 14187
revision: 1
status: active
---
<!-- vpmodule:atom:begin measure-stall-by-lack-of-progress-not-runtime -->
---
instruction_id: measure-stall-by-lack-of-progress-not-runtime
title: "Measure stall by lack of progress, not by runtime"
summary: "A stalled worker is judged by the absence of progress, not by how long it has run."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - graceful-degradation
conditions_applies_when: A delegated agent has been running long enough to look stalled.
conditions_does_not_apply_when: The agent has produced its result.
artifact_contract_output_type: stall-assessment
artifact_contract_required_data:
  - the observed activity
  - the threshold that was crossed
artifact_contract_verified_by: the threshold was measured against the absence of progress and not against the total runtime
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Measure stall by lack of progress, not by runtime
The threshold measures time WITHOUT PROGRESS, not total runtime.
<!-- vpmodule:atom:end measure-stall-by-lack-of-progress-not-runtime -->
<!-- vpmodule:atom:begin never-auto-approve-a-human-verification-gate -->
---
instruction_id: never-auto-approve-a-human-verification-gate
title: Never auto-approve a human verification gate
summary: A gate that needs a person is never approved on their behalf.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An automatic run reaches a gate that needs a person to verify something.
conditions_does_not_apply_when: The gate is a decision the run may take itself.
artifact_contract_output_type: gate-report
artifact_contract_required_data:
  - the gate
  - what the automatic mode did
artifact_contract_verified_by: the gate was presented to the person and nothing was approved on their behalf
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never auto-approve a human verification gate
**Carve-out — overrides all branches above.**
never auto-approve or auto-select. Present to user (standard flow).
Auth gates cannot be automated.
<!-- vpmodule:atom:end never-auto-approve-a-human-verification-gate -->
<!-- vpmodule:atom:begin never-read-an-empty-selection-as-completion -->
---
instruction_id: never-read-an-empty-selection-as-completion
title: Never read an empty selection as completion
summary: An empty selection of remaining work is not reported as a finished unit of work.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The selection of remaining work came back empty.
conditions_does_not_apply_when: The selection still contains work.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the reason the selection was empty
  - the blocked plans
artifact_contract_verified_by: an empty selection was not reported as a finished unit of work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never read an empty selection as completion
"No plan work left" and "phase fully done" are different conditions
A filtered run finding nothing left in ITS slice says nothing about whether the phase as a whole is done, and must never jump to verification.
Blocked-and-incomplete must never be reported as finished.
the phase is NOT finished — it is **stuck on a halt**.
<!-- vpmodule:atom:end never-read-an-empty-selection-as-completion -->
<!-- vpmodule:atom:begin present-a-checkpoint-with-what-is-awaited -->
---
instruction_id: present-a-checkpoint-with-what-is-awaited
title: Present a checkpoint with what is awaited
summary: "The checkpoint names the plan, the progress, the blocker and what the person is being asked for."
capability_tags:
  - triage-reports
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A delegated agent stopped at a checkpoint that needs a person.
conditions_does_not_apply_when: The agent completed the plan.
artifact_contract_output_type: checkpoint-report
artifact_contract_required_data:
  - the checkpoint type
  - the completed tasks
  - the current task and blocker
  - what is awaited
artifact_contract_verified_by: "the report names the plan, the progress and what the person is being asked for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Present a checkpoint with what is awaited
Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
**Progress:** 2/3 tasks complete
User responds: "approved"/"done" | issue description | decision selection
<!-- vpmodule:atom:end present-a-checkpoint-with-what-is-awaited -->
<!-- vpmodule:atom:begin prune-worktrees-with-safety-gates -->
---
instruction_id: prune-worktrees-with-safety-gates
title: Prune worktrees with safety gates
summary: "Delete temporary checkouts only after confirming their changes are preserved or no longer needed; the bucket is advice, not permission."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: "Separate checkouts, branches, or directories remain after the work and need removal."
conditions_does_not_apply_when: The checkout is still in use by another executor.
artifact_contract_output_type: workspace-cleanup
artifact_contract_required_data:
  - list of checkouts
  - change state
  - decision
  - what was preserved
artifact_contract_verified_by: a clean listing of the main checkout after removal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/worktree-cleanup.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Prune worktrees with safety gates
Snapshot and audit: record free disk space, then audit the worktrees.
Read paths from the worktree list, never hand-typed, since a hand-typed path misses one that lives elsewhere.
Classify each worktree by size, age, merge state, uncommitted work, pull request state, and the newest chat that touched it, then suggest a bucket.
The bucket is advice, not permission.
The pinned and active chats are the real artifact.
Get that set from the user or sidebar and cross-check every candidate.
Verify usage before deleting.
For every row marked as recently used, or anything you doubt, read the transcripts and report whether the chat is pinned or ongoing and which worktrees it touches.
A pinned chat can spawn trees into sibling worktrees via background subagents, and those are in use even when their names never hit the sidebar.
Pause on irreversible loss.
Uncommitted work is gone once removed; show the diff and get a decision first.
Untracked throwaway is safe to drop, but name the files.
Clean, merged, and not-in-use work may proceed; work with uncommitted changes or still in use pauses.
Prune the confirmed set per path, remove leftover directories that survive on ignored build artifacts, then prune the worktree records.
Branch refs survive, so no commits are lost.
Confirm with free disk space and re-list.
This is the one pass that deletes user state with no code review to catch a slip, so the gates above are the review.
Report the space reclaimed, the worktrees pruned, and a one-line reason for each held back.
Do not recreate or truncate it here.
If the helper reports a blocked cleanup, resolve the reported manifest entry and rerun the same command. Do not fall back to broad worktree discovery.
sweep orphaned worktrees before dispatching anything
<!-- vpmodule:atom:end prune-worktrees-with-safety-gates -->
<!-- vpmodule:atom:begin reconcile-the-artifacts-before-you-classify-the-outcome -->
---
instruction_id: reconcile-the-artifacts-before-you-classify-the-outcome
title: Reconcile the artifacts before you classify the outcome
summary: "The artifacts on disk and in git decide the outcome, not the way the session ended."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: A delegated agent ended without a normal terminal response.
conditions_does_not_apply_when: The agent returned a normal terminal response.
artifact_contract_output_type: reconciliation-report
artifact_contract_required_data:
  - the summary artifact
  - the commits
  - the verdict
artifact_contract_verified_by: the verdict was decided by the artifacts and not by the way the session ended
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/completion-reconciliation.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Reconcile the artifacts before you classify the outcome
Reconcile FIRST, classify SECOND.
How the child's session ended is bookkeeping about the transport; what it wrote to disk and to git is the evidence about the work.
An abnormally-ended child is not evidence of failure
the orchestrator's own interrupt/close says nothing about whether the work completed; only the artifacts do.
Evidence is BOTH probes or neither: a summary without matching commits, and matching commits without a summary, are each incomplete evidence — never auto-complete on one of them.
Never block indefinitely waiting for a signal; verify via filesystem and git state.
the agent may still be running or may have failed silently
Check `git log --oneline -5` for recent activity. If commits are still appearing, wait longer.
<!-- vpmodule:atom:end reconcile-the-artifacts-before-you-classify-the-outcome -->
<!-- vpmodule:atom:begin resume-at-the-first-step-that-is-missing -->
---
instruction_id: resume-at-the-first-step-that-is-missing
title: Resume at the first step that is missing
summary: A resumed run continues at the first step that is actually missing and skips none of the gates.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run is resuming a unit of work that was interrupted.
conditions_does_not_apply_when: The run starts a unit of work that has not begun.
artifact_contract_output_type: resume-plan
artifact_contract_required_data:
  - the recorded state
  - the step to continue at
artifact_contract_verified_by: the run continued at the first step that was actually missing and did not skip the gates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resume at the first step that is missing
branch on the owner's answer, never on a status word
<!-- vpmodule:atom:end resume-at-the-first-step-that-is-missing -->
<!-- vpmodule:atom:begin show-the-menu-once-per-plan-not-per-task -->
---
instruction_id: show-the-menu-once-per-plan-not-per-task
title: "Show the menu once per plan, not per task"
summary: "The menu appears once per plan, and the run stops only when the person actually says something."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A person drives the execution of a plan task by task.
conditions_does_not_apply_when: The plan runs unattended.
artifact_contract_output_type: menu
artifact_contract_required_data:
  - the options
  - the chosen option
artifact_contract_verified_by: the menu appeared once per plan and the run stopped only when the person actually said something
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the menu once per plan, not per task
Once per plan (not per task), present a 4-option menu (execute / review-first / skip / stop) before starting that plan's tasks.
Once executing, tasks run one at a time with only a brief pause after each — the agent stops mid-plan only if the user actually types something, it does not re-show the menu.
After all plans, proceed to verification as normal.
**If "Review first":** Read and display the full plan file. Ask again: Execute, Modify, Skip.
<!-- vpmodule:atom:end show-the-menu-once-per-plan-not-per-task -->