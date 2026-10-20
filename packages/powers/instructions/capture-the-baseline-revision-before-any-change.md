---
instruction_id: capture-the-baseline-revision-before-any-change
title: Capture the baseline revision before any change
summary: "The revision the work starts from is captured from version control and kept verbatim, so every later comparison has a fixed reference."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: The work will change a version-controlled tree.
conditions_does_not_apply_when: "Version control is unavailable, so there is no revision to capture."
artifact_contract_output_type: baseline-revision
artifact_contract_required_data:
  - the baseline revision
  - the command it came from
artifact_contract_verified_by: the baseline revision was taken from version control and preserved unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-03-implement.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=tools/ticket-tree-rules.md
status: active
revision: 2
---

# Capture the baseline revision before any change
Whenever this workflow captures or records a version-control revision, obtain the full canonical identifier directly from version control and preserve it verbatim.
Capture the baseline revision before making any changes
Before any code change, the build records `baseline_revision` in the plan: the commit the work starts from.
It keeps an existing value when it resumes.
Code review diffs from `baseline_revision`.
The retrospective reads it to find each ticket's changes.
