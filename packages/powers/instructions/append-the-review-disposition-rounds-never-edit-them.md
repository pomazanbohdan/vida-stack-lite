---
instruction_id: append-the-review-disposition-rounds-never-edit-them
title: "Append the review disposition rounds, never edit them"
summary: "Each review round appends its own disposition tables; a later round never edits or deletes an earlier round's tables."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A second review round touches a plan that already carries a disposition ledger.
conditions_does_not_apply_when: The plan carries no ledger yet.
artifact_contract_output_type: review-disposition-ledger
artifact_contract_required_data:
  - the round
  - the addressed concerns
  - the deferred concerns
  - the superseding reference
artifact_contract_verified_by: the earlier round is unchanged and a reversal is a new row that names the round it supersedes
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reviews.md
status: active
revision: 1
---

# Append the review disposition rounds, never edit them
**Append-only.** A later round never edits or deletes a prior round's tables. To overturn a prior round's verdict, add a new row in the current round's table whose Reason/How Addressed names the round and concern it supersedes (e.g. "Supersedes Round 1 Deferred: {concern} — now addressed in Plan 3")
**Anchoring.** Any reference to a specific REVIEWS.md line cites `L##@{REVIEWS_sha}` (e.g. `L32@a1b2c3d`) — a bare line number is meaningless once the next round rewrites REVIEWS.md wholesale
