---
instruction_id: recommend-a-follow-up-review-by-a-fixed-rule
title: Recommend a follow-up review by a fixed rule
summary: "The follow-up recommendation follows one rule: patch volume alone never justifies it, and a recommendation has to name the unverified risk."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A review pass finished and the work may need another pass.
conditions_does_not_apply_when: No review pass ran.
artifact_contract_output_type: follow-up-recommendation
artifact_contract_required_data:
  - the recommendation
  - the patched counts by verdict
  - the unverified risk it names
artifact_contract_verified_by: the recommendation follows the rule and names the risk or stays false
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Recommend a follow-up review by a fixed rule
Follow-up review recommendation: default `false`.
Count only this pass's entries triaged `patch`, at entry verdict — never deferred or `false` ones.
On a first pass, `true` if any patched entry was Critical, or if two or more Important entries were patched
otherwise the work has converged; patch volume is never grounds
