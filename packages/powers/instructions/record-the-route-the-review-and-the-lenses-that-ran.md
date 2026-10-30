---
instruction_id: record-the-route-the-review-and-the-lenses-that-ran
title: "Record the route, the review and the lenses that ran"
summary: "The run state lives in the artifact itself: the route, the review depth, whether each was pinned or chosen automatically, and the ids of the review lenses in launch order."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A route is chosen or a review pass starts.
conditions_does_not_apply_when: Nothing was chosen and no review ran.
artifact_contract_output_type: run-state-record
artifact_contract_required_data:
  - the route
  - the source of the route choice
  - the review depth
  - the source of the review choice
  - "the ids of the lenses that ran, in launch order"
artifact_contract_verified_by: "a later run can read the route, the review depth and the lens ids from the artifact"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-04-review.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-02-plan.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-oneshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: The body lists route and review metadata writes but gives no selection conditions or ordered execution sequence.
---

# Record the route, the review and the lenses that ran

Set `route: 'oneshot'`, `route_source: 'pinned'`, and `status: 'in-progress'`, resolving `date` to the current system date.

Set `route: 'full'` and `route_source: 'pinned'`, then continue.

Set `route: 'full'` and `route_source: 'auto'`, then continue.

Write `review: 'none'`, `review_source: 'pinned'`, and `lenses_ran: []` to `{plan_file}` frontmatter.

Write `review: 'quick'` and `review_source: 'auto'` to `{plan_file}` frontmatter.

Write `review: 'thorough'` and `review_source: 'auto'` to `{plan_file}` frontmatter.

Write `lenses_ran` — the ids launched, in launch order — to `{plan_file}` frontmatter.
