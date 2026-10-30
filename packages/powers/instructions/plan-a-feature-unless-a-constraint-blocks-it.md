---
instruction_id: plan-a-feature-unless-a-constraint-blocks-it
title: Plan a feature unless a constraint blocks it
summary: "A feature is split or flagged only for a constraint - context cost, missing information or a dependency conflict - and a judgement about difficulty is not a reason to leave it out."
capability_tags:
  - plan-implementation
  - disagree-with-reasons
pattern_tags:
  - implementation-planning
  - reasoned-disagreement
conditions_applies_when: "A feature is about to be split, deferred or left out of the plan."
conditions_does_not_apply_when: A constraint already blocks the feature.
artifact_contract_output_type: planning-decision
artifact_contract_required_data:
  - the constraint that blocks the feature
  - the feature that is planned
artifact_contract_verified_by: every feature without a constraint is in the plan and every exclusion names a constraint
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-source-audit.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Plan a feature unless a constraint blocks it
### Authority Limits — Constraint Examples

The planner's only legitimate reasons to split or flag a feature are **constraints**, not judgments about difficulty:

**Valid (constraints):**
- ✓ "This task touches 9 files and would consume ~45% context — split into two tasks"
- ✓ "No API key or endpoint is defined in any source artifact — need developer input"
- ✓ "This feature depends on the auth system built in Phase 03, which is not yet complete"

**Invalid (difficulty judgments):**
- ✗ "This is complex and would be difficult to implement correctly"
- ✗ "Integrating with an external service could take a long time"
- ✗ "This is a challenging feature that might be better left to a future phase"

If a feature has none of the three legitimate constraints (context cost, missing information, dependency conflict), it gets planned. Period.
