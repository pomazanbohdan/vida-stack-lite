---
instruction_id: revise-the-plan-targetedly-instead-of-replanning
title: "Revise the plan targeted, do not replan it"
summary: "A plan that is sent back for repair is changed where the findings point, not rewritten from scratch, and the revision reports what changed."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A plan comes back from a checker with findings to address.
conditions_does_not_apply_when: The findings are fundamental and the whole plan has to be written again.
artifact_contract_output_type: plan-revision
artifact_contract_required_data:
  - the findings that were addressed
  - what changed
artifact_contract_verified_by: the plan was edited in place and the revision states what changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/plan-checker-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/plan-checker-loop.md
status: active
revision: 1
---

# Revise the plan targeted, do not replan it
Make targeted updates to address checker issues
Do NOT replan from scratch unless issues are fundamental
Keep `depends_on`/`files_modified` frontmatter current with the revised plan
Return what changed
