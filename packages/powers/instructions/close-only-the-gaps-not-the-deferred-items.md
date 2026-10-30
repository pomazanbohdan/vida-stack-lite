---
instruction_id: close-only-the-gaps-not-the-deferred-items
title: "Close only the gaps, not the deferred items"
summary: The gap list is the only actionable source for gap-closure planning; the deferred list is not a gap.
capability_tags:
  - plan-implementation
pattern_tags:
  - scope-routing
conditions_applies_when: Gap-closure plans are written from a verification report that carries both a gap list and a deferred list.
conditions_does_not_apply_when: The report carries only gaps.
artifact_contract_output_type: gap-closure-scope
artifact_contract_required_data:
  - the gap items addressed
  - the deferred items left alone
artifact_contract_verified_by: no plan was created for a deferred item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Close only the gaps, not the deferred items
**Important: Skip deferred items.** When reading VERIFICATION.md, only the `gaps:` section contains actionable items that need closure plans. The `deferred:` section (if present) lists items explicitly addressed in later milestone phases — these are NOT gaps and must be ignored during gap closure planning. Creating plans for deferred items wastes effort on work already scheduled for future phases
**5. Group gaps into plans** by: same artifact, same concern, dependency order (can't wire if artifact is stub → fix stub first)
