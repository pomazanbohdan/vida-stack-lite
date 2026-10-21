---
instruction_id: wait-for-the-quota-reset-instead-of-retrying
title: Wait for the quota reset instead of retrying
summary: "A quota failure is answered by waiting for the reset, not by retrying into the same limit."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A delegated agent failed because a provider quota or rate limit was hit.
conditions_does_not_apply_when: The agent failed for a reason the run can fix itself.
artifact_contract_output_type: failure-report
artifact_contract_required_data:
  - the sentinel that was found
  - the recovery action
artifact_contract_verified_by: the run waited for the reset instead of retrying into the same limit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Wait for the quota reset instead of retrying
Agent return body contains a sentinel like `usage limit`, `rate limit`, `429`, `too many requests`, `RESOURCE_EXHAUSTED`, `usage_limit_reached`.
Do not offer retry-now; the right action is wait-for-reset and resume.
