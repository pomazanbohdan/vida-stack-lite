---
instruction_id: mark-the-claim-the-repository-cannot-prove
title: Mark the claim the repository cannot prove
summary: A claim the repository cannot prove is marked for a human to verify.
capability_tags:
  - write-technical-prose
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A claim about infrastructure is written that the repository cannot prove.
conditions_does_not_apply_when: The claim was checked against a source in the repository.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the claim
  - the marker
artifact_contract_verified_by: every claim that the repository cannot prove carries a marker for manual verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update/detail/elaboration.md
status: active
revision: 1
---

# Mark the claim the repository cannot prove
Apply VERIFY markers to any infrastructure claim not discoverable from the repository.
for infrastructure claims that require manual verification.
