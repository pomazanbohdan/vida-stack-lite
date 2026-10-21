---
instruction_id: resolve-a-path-the-way-the-shell-would-land-in-it
title: Resolve a path the way the shell would land in it
summary: "A path is resolved the way the shell would reach it, so a link or a parent hop that leaves the workspace is seen for what it is."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A path is checked against the workspace root.
conditions_does_not_apply_when: The path is a plain relative path inside the workspace.
artifact_contract_output_type: resolved-path
artifact_contract_required_data:
  - the path as written
  - the directory it lands in
artifact_contract_verified_by: the resolved path is the one the shell would reach
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/worktree-path-safety.md
status: active
revision: 1
---

# Resolve a path the way the shell would land in it
Resolve a path the way the shell would land in it
A relative path is taken from the second
argument - the cwd a chained `cd` has reached so far - or the worktree root
An existing directory resolves through `cd && pwd -P`
a file through its directory (a
symlinked file through its link target first), so a symlink or `..` hop inside the worktree that
lands in the main checkout is seen for what it is
normalized lexically and must still PASS when it sits under the worktree
