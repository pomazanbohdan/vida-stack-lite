---
instruction_id: let-the-derived-plan-add-to-the-contract-but-never-subtract-from-it
title: Let the derived plan add to the contract but never subtract from it
summary: A plan may add criteria to the agreed ones; the criteria the contract already fixed are all still verified.
capability_tags:
  - verify-work-results
pattern_tags:
  - frozen-intent
conditions_applies_when: A derived plan lists fewer criteria than the contract it was derived from.
conditions_does_not_apply_when: The plan lists all the contract criteria.
artifact_contract_output_type: coverage-check
artifact_contract_required_data:
  - the contract criteria
  - the criteria the plan added
artifact_contract_verified_by: every contract criterion is still verified and the plan only ever added criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 1
---

# Let the derived plan add to the contract but never subtract from it
**CRITICAL:** PLAN frontmatter must-haves must NOT reduce scope. If ROADMAP.md defines 5 Success Criteria but the plan only lists 3 in must_haves, all 5 must still be verified. The plan can ADD must-haves but never subtract roadmap SCs.
