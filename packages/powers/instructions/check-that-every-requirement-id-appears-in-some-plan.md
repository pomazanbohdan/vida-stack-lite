---
instruction_id: check-that-every-requirement-id-appears-in-some-plan
title: Check that every requirement id appears in some plan
summary: "The requirement ids are distributed across the plans, and a requirement no plan claims is a blocking gap."
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: A phase is planned against a list of requirements.
conditions_does_not_apply_when: The phase has no requirements.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the requirement ids
  - the plan that claims each
artifact_contract_verified_by: every requirement id is claimed by at least one plan
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Check that every requirement id appears in some plan
Every requirement ID MUST appear in at least one plan. Plans with an empty `requirements` field are invalid.
Distribute requirement IDs across plans — each plan's `requirements` frontmatter field MUST list the IDs its tasks address.
