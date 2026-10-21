---
instruction_id: start-with-the-consensus-summary
title: Start with the consensus summary
summary: The consensus section carries the signal two or more reviewers agree on; the divergent section carries where they disagreed.
capability_tags:
  - review-code
pattern_tags:
  - report-triage
conditions_applies_when: The review output of several reviewers is read.
conditions_does_not_apply_when: A single reviewer produced the output.
artifact_contract_output_type: review-output-triage
artifact_contract_required_data:
  - the concerns two or more reviewers raised
  - the areas the reviewers disagreed on
artifact_contract_verified_by: the consensus and the divergence are both read before the findings are acted on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 1
---

# Start with the consensus summary
A **Consensus Summary** section that synthesises concerns raised by two or more reviewers — start here for the highest-priority signal
A **Divergent Views** section for areas where reviewers disagreed
