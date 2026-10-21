---
instruction_id: reconcile-the-as-built-with-the-spec
title: Reconcile the as-built with the spec
summary: "Every divergence between the as-built and the declared intent is classified as a defect, an accepted deviation or a spec that has to be reconciled."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work is compared with the criteria it set for itself.
conditions_does_not_apply_when: The work changed no behavior and no requirement.
artifact_contract_output_type: spec-reconciliation
artifact_contract_required_data:
  - the divergence
  - its class
  - the requirement or the criterion it touches
artifact_contract_verified_by: "every divergence is classified as a defect, an accepted deviation or a reconciliation to propose"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/complete-milestone.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/post-execution-verification.md
status: active
revision: 2
---

# Reconcile the as-built with the spec
**Spec-to-implementation reconciliation** — where the as-built diverges from the epic file's Done when and the initiative Requirements each ticket's `covers` names, with PRD/architecture as context.
Requirements silently dropped, added behavior nobody specified, intent reinterpreted between tickets.
Each divergence is either a defect (fix), an accepted deviation (record so later runs stop re-flagging it), or a spec that should be reconciled to reality (propose in Phase 4).
After a release, review the project description against what was actually built and update every field that drifted.
"What This Is" accuracy: compare the current description to what was built and update it if the product has meaningfully changed.
Core Value check: still the right priority? Did shipping reveal a different core value?
Out of Scope audit: review each item - is the reasoning still valid? Remove the items that are irrelevant.
Key Decisions audit: extract all decisions from the phase summaries and add them with their outcomes.
All shipped requirements move to the validated section.
System MUST check against phase goals, not just task completion
Automated check that the codebase delivers what the phase promised.
