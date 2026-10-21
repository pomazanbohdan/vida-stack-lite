---
instruction_id: use-independent-reviewers-because-their-blind-spots-differ
title: Use independent reviewers because their blind spots differ
summary: "Reviewers run the same prompt independently; different models miss different things, so consensus catches more than one reviewer."
capability_tags:
  - review-code
pattern_tags:
  - multi-voice-delivery
conditions_applies_when: Several reviewers are available for a review.
conditions_does_not_apply_when: A single reviewer is the only option.
artifact_contract_output_type: multi-reviewer-run
artifact_contract_required_data:
  - the reviewers that ran
  - the feedback each of them produced
artifact_contract_verified_by: each reviewer ran the same prompt independently and its feedback is reported separately
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/set-up-cross-ai-review.md
status: active
revision: 1
---

# Use independent reviewers because their blind spots differ
Each reviewer runs the same structured prompt against your `PLAN.md` files independently.
Because different models have different blind spots, multi-reviewer consensus catches more issues than any single reviewer.
