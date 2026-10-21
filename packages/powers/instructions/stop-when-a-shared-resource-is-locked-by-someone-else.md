---
instruction_id: stop-when-a-shared-resource-is-locked-by-someone-else
title: Stop when a shared resource is locked by someone else
summary: "When a shared resource is held by another party, the run records the blocked state, names the remedy and stops; it does not wait for the lock."
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: A shared resource needed by the run is locked by another instance.
conditions_does_not_apply_when: The lock is held by the run itself.
artifact_contract_output_type: blocked-resource
artifact_contract_required_data:
  - the blocked resource
  - the recorded outcome and reason
  - the remedy named for the operator
artifact_contract_verified_by: "the run stopped, named the remedy and did not wait"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/live-dom-uat/fragments/execute-wave-post.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 1
---

# Stop when a shared resource is locked by someone else
- **Stop.** Do not retry, do not loop, do not wait for the lock.
- Parallel execution waves sharing one profile WILL hit this. It is an expected condition, not a defect, and it is not a reason to fail anything.
- Coordination over a resource you do not own is theatre — it adds machinery, and the lock still happens.
- So the verifier tolerates the lock instead: it reports `could_not_look` / `profile_locked`, names `--isolated` so the operator knows the remedy, and stops. No retry, no wait, no held-up wave.
