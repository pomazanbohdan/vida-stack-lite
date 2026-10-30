---
instruction_id: run-a-quality-gate-before-you-report-the-plans-ready
title: Run a quality gate before you report the plans ready
summary: The plans are checked against a fixed list before the run announces them as ready.
capability_tags:
  - plan-implementation
pattern_tags:
  - completion-criteria
conditions_applies_when: A planning run is about to report that it finished.
conditions_does_not_apply_when: The run produced no plans.
artifact_contract_output_type: planning-quality-gate
artifact_contract_required_data:
  - the checks that were run
  - the verdict on each
artifact_contract_verified_by: every check on the list is satisfied before the plans are reported as ready
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/planner-subagent-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Run a quality gate before you report the plans ready
Before returning PLANNING COMPLETE:
- [ ] PLAN.md files created in phase directory - [ ] Each plan has valid frontmatter - [ ] Tasks are specific and actionable - [ ] Dependencies correctly identified - [ ] Waves assigned for parallel execution - [ ] must_haves derived from phase goal
