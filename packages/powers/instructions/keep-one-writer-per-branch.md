---
instruction_id: keep-one-writer-per-branch
title: Keep one writer per branch
summary: "Give a chain one writer: owners push only their own branches, and only the root rebases or retargets a link."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - program-orchestration
conditions_applies_when: "Several agents work on branches, a chain, or a stack at the same time."
conditions_does_not_apply_when: A single agent owns the whole change from branch to merge.
artifact_contract_output_type: branch-ownership
artifact_contract_required_data:
  - branch
  - owner
  - tip and parent
  - pushes
artifact_contract_verified_by: a branch listing showing one owner per branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/autopilot-stack.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep one writer per branch
Give the topology one writer.
Owners push only their own branches and report each tip and its intended parent.
Only the root rebases or retargets a link, because two writers on one chain undo each other.
Owners never rebase onto another branch, trunk included, and never retarget, merge, close a PR, or arm auto-merge, because the root owns the chain's topology and the operator owns the landing.
When an item depends on another, its owner branches from that item's branch, not from trunk.
An owner takes the root's push as its new base and lease, and on a conflict resolves its own slice for the root to push.
Once landing starts, nobody writes to the chain except the post-merge retarget that shipping sanctions, because a second writer breaks a landing in flight.
A mid-landing problem goes through the root to the operator, and any fix waits for the operator's go.
Force-push only your own branch, with the lease pinned to the SHA you last pushed or took over.
On any push you did not make, stop and report to the root.
Never push a fix yourself, because each branch has one writer; replace a stuck owner instead.
Workers never rebase and never retarget or merge PRs.
Babysitters report conflicts to the stacker rather than rebasing.
PR closes and retargets go through the stacker only.
Closing a base PR orphans every chain above it.
Exactly one stacker per stack may mutate topology, meaning chain rebases, force-pushes, base retargets, and merges, serialized within its stack.
Record the holder in the standing orders.
