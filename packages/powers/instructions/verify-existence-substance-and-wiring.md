---
instruction_id: verify-existence-substance-and-wiring
title: "Verify existence, substance and wiring"
summary: "A required artifact is checked at three levels: that it exists, that it carries substance, and that it is wired into the system."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-harness
conditions_applies_when: A required artifact is verified.
conditions_does_not_apply_when: Nothing is required to exist.
artifact_contract_output_type: three-level-verification
artifact_contract_required_data:
  - the existence result
  - the substance result
  - the wiring result
  - the verdict
artifact_contract_verified_by: all three levels were checked and the verdict names the level that failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/few-shot-examples/verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Verify existence, substance and wiring
The verifier checked all three levels independently with specific evidence at each level -- file path, line count, exported symbols, import location, and argument verification.
It did not stop at "file exists" but traced wiring through to actual usage with correct arguments.
The verifier caught a common calibration pattern: code that exists, is tested, but is never actually wired into the system.
L1 and L2 pass, but L3 (wiring) fails.
Level 2 (substantive) and Level 3 (wired) were skipped entirely.
A file that exists but is never imported or contains only placeholder code should not pass.
