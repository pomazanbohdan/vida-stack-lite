---
instruction_id: clean-up-integration-workspace
title: Clean up only the workspace you own
summary: "Remove only worktrees created for this work, never force over unique files, and leave host-owned workspaces in place."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Integration is complete or the owner confirmed discarding the work.
conditions_does_not_apply_when: "The work was left for review, more work, or a deferred decision."
artifact_contract_output_type: workspace-cleanup
artifact_contract_required_data:
  - workspace owner
  - file state
  - cleanup performed
artifact_contract_verified_by: no unique files are removed without an explicit choice
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/finishing-a-development-branch/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Clean up only the workspace you own
Cleanup runs for the local merge and for confirmed discards.
Push-and-create-PR and keep-as-is always preserve the worktree.
Worktree removal must run from outside the worktree.
If the repository is normal, there is no worktree to clean up.
If the worktree is under the managed worktrees directory, you own cleanup.
Remove the worktree and prune stale registrations.
If removal is refused, the worktree holds files that exist nowhere else.
Those may be uncommitted plans, notes, or scratch work.
Never force on your own initiative.
Show your human partner what is at stake and ask.
Ask whether to commit the files to the branch.
Ask whether to move them into the main repository root.
Ask whether to delete them, knowing that is unrecoverable.
Carry out the choice, then remove the worktree.
Otherwise the host environment owns this workspace; leave it in place.
If your platform provides a workspace-exit tool, use it.
Clean up only worktrees under the managed worktrees directory.
Everything else belongs to the host.
