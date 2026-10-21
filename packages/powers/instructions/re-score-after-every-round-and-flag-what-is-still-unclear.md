---
instruction_id: re-score-after-every-round-and-flag-what-is-still-unclear
title: Re-score after every round and flag what is still unclear
summary: After every round of questions the dimensions are re-scored and shown; when the round budget runs out the document is written with the open dimensions marked as assumptions.
capability_tags:
  - clarify-requirements
pattern_tags:
  - staged-elicitation
conditions_applies_when: An interview runs in rounds towards a quantified clarity threshold.
conditions_does_not_apply_when: The interview is a single round.
artifact_contract_output_type: scored-rounds
artifact_contract_required_data:
  - the round
  - the updated scores
  - the dimensions below their minimum
artifact_contract_verified_by: every round was re-scored and shown and the open dimensions are marked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Re-score after every round and flag what is still unclear
After each round:
Update all 4 dimension scores from the user's answers
Calculate new ambiguity score
Display the updated scoring:
**If max rounds reached (6) and gate not passed:**
Write SPEC.md anyway — flag unresolved dimensions.
**If any dimensions are below minimum**, mark them in the Ambiguity Report with: `⚠ Below minimum — planner must treat as assumption`.
