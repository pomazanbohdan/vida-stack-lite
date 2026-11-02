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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/plan-checker-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick/steps/plan-checker-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Revise the plan targeted, do not replan it
Make targeted updates to address checker issues
Do NOT replan from scratch unless issues are fundamental
Keep `depends_on`/`files_modified` frontmatter current with the revised plan
Return what changed
