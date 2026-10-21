---
instruction_id: mark-a-logic-fix-as-needing-human-verification
title: Mark a logic fix as needing human verification
summary: A change that only passes the syntax check is not a verified fix; a logic change is reported as needing a human to confirm it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix changes logic rather than only structure.
conditions_does_not_apply_when: The fix is a formatting or import change with no behavioural effect.
artifact_contract_output_type: fix-record
artifact_contract_required_data:
  - the verification level reached
  - the need for a human check
artifact_contract_verified_by: a logic fix is reported as requiring human verification
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.compact.md
status: active
revision: 1
---

# Mark a logic fix as needing human verification
Tier 1 and Tier 2 only verify syntax/structure, NOT semantic correctness.
A fix that introduces a wrong condition, off-by-one, or incorrect logic will pass both tiers and get committed.
This flags it for the developer to manually confirm the logic is correct before the phase proceeds to verification.
