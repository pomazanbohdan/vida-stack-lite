---
instruction_id: declare-the-plans-dependencies-files-and-deletions
title: "Declare the plan's dependencies, files and deletions"
summary: "A plan declares the units it depends on, the files it will touch and the files it will delete, and a deletion that the plan does not declare blocks the integration."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan is written and will be integrated into a shared branch.
conditions_does_not_apply_when: The plan is executed on its own and never integrated.
artifact_contract_output_type: plan-declaration
artifact_contract_required_data:
  - the dependencies
  - the touched files
  - the declared deletions
artifact_contract_verified_by: the plan names every deletion it performs and the integration accepted it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 1
---

# Declare the plan's dependencies, files and deletions
ALWAYS emit `files_modified` frontmatter (array of repo-relative paths
Reference ONLY quick ids from the catalog above; never invent one, never reference a task from a different batch
If this plan will delete any file, ALSO emit `files_deleted` frontmatter naming exactly those paths
an undeclared deletion blocks the merge
