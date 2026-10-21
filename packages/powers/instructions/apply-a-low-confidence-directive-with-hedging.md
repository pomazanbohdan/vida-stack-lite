---
instruction_id: apply-a-low-confidence-directive-with-hedging
title: Apply a low-confidence directive with hedging
summary: A directive that is certain is applied directly and one that is uncertain is tried with a hedge.
capability_tags:
  - consult-guidance
pattern_tags:
  - trust-graded-context
conditions_applies_when: A directive about how to work is loaded from a profile.
conditions_does_not_apply_when: The directive carries a stated confidence.
artifact_contract_output_type: directive-application
artifact_contract_required_data:
  - the directive
  - the confidence it carries
  - the way it was applied
artifact_contract_verified_by: an uncertain directive was applied with a hedge and a certain one was applied directly
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/dev-preferences.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/user-profile.md
status: active
revision: 1
---

# Apply a low-confidence directive with hedging
Higher confidence directives should be applied directly. Lower confidence directives should be tried with hedging ("Based on your profile, I'll try X -- let me know if that's off").
