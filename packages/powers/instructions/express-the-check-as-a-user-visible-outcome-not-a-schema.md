---
instruction_id: express-the-check-as-a-user-visible-outcome-not-a-schema
title: "Express the check as a user-visible outcome, not a schema"
summary: "A check is written as what the user sees, never as a field, an endpoint or a status code."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A check for a user-facing phase is written.
conditions_does_not_apply_when: The check is an internal technical assertion.
artifact_contract_output_type: user-visible-check
artifact_contract_required_data:
  - the user-visible outcome
  - the check that proves it
artifact_contract_verified_by: "no check names a field, an endpoint or a status code"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verify-mvp-mode.md
status: active
revision: 1
---

# Express the check as a user-visible outcome, not a schema
The user-flow form mirrors what a real user does: open, fill, click, see. No HTTP verbs, no JSON shapes, no error codes
"User has a `name` field on the User model." Reject. The user does not see database fields. Express the same check as a user-visible outcome ("the user's name appears in the dashboard header")
"Step 1: GET /api/users/me returns 200." Reject. The user does not see API endpoints. Reorder so a user action comes first
Coverage is a goal-backward check: "did this phase deliver what its user story promised?"
