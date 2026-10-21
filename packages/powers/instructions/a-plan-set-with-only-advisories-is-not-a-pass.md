---
instruction_id: a-plan-set-with-only-advisories-is-not-a-pass
title: A plan set with only advisories is not a pass
summary: Any finding at all means the plan set is reported as carrying issues; only a plan set with nothing at all is a pass.
capability_tags:
  - plan-implementation
pattern_tags:
  - finding-severity-policy
conditions_applies_when: The overall verdict of a plan review is decided.
conditions_does_not_apply_when: The plan set has no findings.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the verdict
  - the findings by severity
artifact_contract_verified_by: the verdict distinguishes an advisory-only result from a clean one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-plan-checker.md
status: active
revision: 1
---

# A plan set with only advisories is not a pass
passed: All requirements covered, all tasks complete, dependency graph valid, key links planned, scope within budget, must_haves properly derived — and zero issues of any severity.
An advisory-only result is NOT `passed`.
Plans need revision only when Critical or Important issues are present.
