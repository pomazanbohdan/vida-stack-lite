---
instruction_id: treat-a-fix-hint-as-an-example-not-an-order
title: "Treat a fix hint as an example, not an order"
summary: "The property that must hold and the evidence that it does not are binding; the hint is one route to it, and a smaller mechanism that satisfies the property addresses the issue in full."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - code-review
conditions_applies_when: A checker returns an issue with a suggested fix.
conditions_does_not_apply_when: No issue was returned.
artifact_contract_output_type: addressed-issue
artifact_contract_required_data:
  - the property that had to hold
  - the mechanism that made it hold
  - the derived property when the checker omitted the field
artifact_contract_verified_by: the property holds and the reported mechanism is the one that was used
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
status: active
revision: 1
---

# Treat a fix hint as an example, not an order
**What binds and what does not.** `required_property` (the invariant that must hold), `description` (the evidence it does not) and `severity` are binding. `fix_hint` is **one example** of a route to that property - an illustration, never an instruction. You address an issue by making `required_property` true; the hint's own mechanism is optional.
**Prefer the smallest sufficient mechanism.** If a smaller change than the hint makes `required_property` true, take it - that fully addresses the issue and must be reported as addressed, naming the property satisfied and the mechanism used.
An older checker may return an issue with no `required_property`. Derive it from `dimension` + `description` and state the derived property in your revision summary. Never treat the absence of the field as licence to apply `fix_hint` literally.
**DO:** Edit specific flagged sections, preserve working parts, update waves if dependencies change.
