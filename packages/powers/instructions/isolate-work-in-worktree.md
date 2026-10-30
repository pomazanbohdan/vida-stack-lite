---
instruction_id: isolate-work-in-worktree
title: Work in an isolated workspace
summary: "Keep new work in an isolated workspace, and never create a second one when you are already isolated."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: "You start feature work that needs isolation from the current workspace, or before executing an implementation plan."
conditions_does_not_apply_when: "The user declined an isolated workspace, and you work in place."
artifact_contract_output_type: isolated-workspace-record
artifact_contract_required_data:
  - the isolation state you detected
  - the workspace path
  - the branch
artifact_contract_verified_by: the working tree you report is the one you are working in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/using-git-worktrees/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Work in an isolated workspace

Ensure work happens in an isolated workspace.
Prefer the native worktree tools of your platform, and fall back to manual git worktrees only when no native tool is available.

Core principle: detect existing isolation first, then use native tools, then fall back to git; never fight the harness.

Detect the existing isolation before creating anything: if the git directory differs from the common git directory you are already in a linked worktree, so do not create another one, and report the path and the branch state instead.
Beware of submodules, where the same difference is true: check the superproject before concluding that you are in a worktree.

If you are in a normal checkout, honour any worktree preference the user already stated. If there is none, ask for consent before creating a worktree, because it protects the current branch from changes. If the user declines, work in place.

To create the workspace, try the mechanisms in this order: first a native worktree tool, which handles directory placement, branch creation and cleanup automatically; only when none exists, fall back to a manual git worktree, because the manual command creates phantom state that your harness cannot see or manage.
