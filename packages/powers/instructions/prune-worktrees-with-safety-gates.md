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
status: active
revision: 1
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
