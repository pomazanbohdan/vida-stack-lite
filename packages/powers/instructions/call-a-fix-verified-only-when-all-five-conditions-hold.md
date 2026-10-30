---
instruction_id: call-a-fix-verified-only-when-all-five-conditions-hold
title: Call a fix verified only when all five conditions hold
summary: "The original symptom is gone, the mechanism is understood, the neighbours still work, it works elsewhere, and it is stable."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A fix is reported as verified.
conditions_does_not_apply_when: The fix is still being developed.
artifact_contract_output_type: verification-report
artifact_contract_required_data:
  - the five conditions
artifact_contract_verified_by: all five conditions were checked and a missing one keeps the fix unverified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Call a fix verified only when all five conditions hold
Original issue no longer occurs - Exact reproduction steps now produce correct behavior
You understand why the fix works - Can explain the mechanism (not "I changed X and it worked")
Related functionality still works - Regression testing passes
Fix works across environments - Not just on your machine
Fix is stable - Works consistently, not "worked once"
Anything less is not verified.
