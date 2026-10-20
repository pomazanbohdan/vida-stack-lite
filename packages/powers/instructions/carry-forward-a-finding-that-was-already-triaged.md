---
instruction_id: carry-forward-a-finding-that-was-already-triaged
title: Carry forward a finding that was already triaged
summary: A finding that a logged row already covers keeps its verdict and its route; it is not verified again and never patched or deferred twice.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: The review runs again over a change that was already reviewed.
conditions_does_not_apply_when: This is the first review pass over the change.
artifact_contract_output_type: carried-finding
artifact_contract_required_data:
  - the carried row
  - the verdict and route it kept
  - the evidence that shows the code still reads the same
artifact_contract_verified_by: the carried row was kept and nothing was patched or deferred for it again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Carry forward a finding that was already triaged
Same location and same claim as a logged row, and the code there still reads as the row describes: keep the row's verdict and route, write the row again with `carried` in front of the evidence, skip verification, and never patch or defer it again.
