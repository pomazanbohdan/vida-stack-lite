---
instruction_id: run-the-review-lanes-at-the-session-model-capability
title: Run the review lanes at the session model capability
summary: "Every review lane runs at the same model capability as the session, so the lanes stay comparable with each other."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Review lanes are launched for a change.
conditions_does_not_apply_when: Only one reviewer runs.
artifact_contract_output_type: review-dispatch
artifact_contract_required_data:
  - the lanes
  - the model capability each ran at
artifact_contract_verified_by: every lane ran at the session model capability
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Run the review lanes at the session model capability
All review subagents must run at the same model capability as the current session.
