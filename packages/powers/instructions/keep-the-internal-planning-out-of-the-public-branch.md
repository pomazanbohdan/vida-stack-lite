---
instruction_id: keep-the-internal-planning-out-of-the-public-branch
title: Keep the internal planning out of the public branch
summary: The published branch carries the code and the structural state; the transient planning artifacts stay out and the count of what leaked must be zero.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch is prepared for publication.
conditions_does_not_apply_when: The branch is internal and never published.
artifact_contract_output_type: publish-filter
artifact_contract_required_data:
  - the mode the filter ran in
  - the number of forbidden paths in the diff
  - the deletion count
artifact_contract_verified_by: the forbidden-path count and the deletion count are both zero before the branch is published
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pr-branch.md
status: active
revision: 1
---

# Keep the internal planning out of the public branch
the PR branch contains code changes and structural planning state.
is the pass/fail number — it must be `0`.
A non-zero value means the filter did not do what this mode promised; report it and do not tell the user to push.
