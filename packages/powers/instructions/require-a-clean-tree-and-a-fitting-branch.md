---
instruction_id: require-a-clean-tree-and-a-fitting-branch
title: Require a clean tree and a fitting branch
summary: "Before the work starts, the working tree is clean and the branch fits the intent; the destination and the tooling that reaches it are available; otherwise the run stops."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The work is about to change files in a version-controlled tree.
conditions_does_not_apply_when: "Version control is unavailable, so there is no tree to check."
artifact_contract_output_type: preflight-check
artifact_contract_required_data:
  - the tree state
  - the branch
  - the intent the branch must fit
artifact_contract_verified_by: the tree was clean and the branch matched the intent before the first change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pr-branch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 2
---

# Require a clean tree and a fitting branch
If version control is unavailable, skip this check. Otherwise require a clean working tree, a branch that fits the intent, and writable repository metadata.
For Git, run `git add --refresh -- .`, then confirm the tree is still clean; on failure or change, HALT with status `blocked` and blocking condition `version-control metadata not writable`.
For a ticket from the tree, judge the branch against the epic, not the story.
HALT on a dirty tree or obvious branch mismatch.
Working tree has uncommitted changes — commit or stash them first:
git cherry-pick refuses to run against a dirty tree anyway — so fail here, where the message is legible, rather than midway through the cherry-pick loop.
If uncommitted changes exist: ask user to commit or stash first.
If `IS_PROTECTED` is `true`: warn — should be on a feature branch.
If no remote: error — can't create PR.
If `gh` not found or not authenticated: provide setup instructions and exit.
