---
instruction_id: mark-a-superseded-plan-so-it-does-not-hold-the-phase-below-complete
title: Mark a superseded plan so it does not hold the phase below complete
summary: "A unit of work that was reassigned or dropped is marked, so it leaves both the numerator and the denominator of the phase's completion count instead of holding the phase below done forever."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A unit of work will never be executed because its work moved elsewhere.
conditions_does_not_apply_when: The unit of work is going to be executed.
artifact_contract_output_type: superseded-marker
artifact_contract_required_data:
  - the plan that is superseded
  - the counts it leaves
  - "what happens to the phase's completion"
artifact_contract_verified_by: the superseded plan left the completion counts and the phase reads complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
status: active
revision: 1
---

# Mark a superseded plan so it does not hold the phase below complete
- Add `status: superseded` to that plan's frontmatter to exclude it from **both** the plan count (denominator) and the summary count (numerator):
- A phase with 13 plans, two of them `superseded`, then reads `11/11 → complete` — no fabricated summary required.
