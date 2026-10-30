---
instruction_id: reject-a-vague-requirement
title: Reject a vague requirement
summary: "A requirement that could describe any system is refused; each one states a specific testable condition, what exists now, what it should become and how the change is verified."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: A requirement is written down and it may be too vague to build against.
conditions_does_not_apply_when: The requirement is already specific and verifiable.
artifact_contract_output_type: requirement-set
artifact_contract_required_data:
  - the requirement
  - the current state
  - the target state
  - the acceptance criterion
artifact_contract_verified_by: "no requirement is vague and each carries current state, target state and criterion"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - product
---

# Reject a vague requirement
**Vague requirements are rejected:**
✗ "The system should be fast"
✗ "Improve user experience"
✓ "API endpoint responds in < 200ms at p95 under 100 concurrent requests"
✓ "CLI command exits with code 1 and prints to stderr on invalid input"
One specific, testable statement
Current state (what exists now)
Target state (what it should become)
Acceptance criterion (how to verify it was met)
