---
instruction_id: check-existence-then-substance-then-wiring-then-behaviour
title: "Check existence, then substance, then wiring, then behaviour"
summary: A file existing does not mean the feature works; the four levels are checked in that order.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An artefact is being verified.
conditions_does_not_apply_when: The artefact was already verified at the first level.
artifact_contract_output_type: artifact-levels
artifact_contract_required_data:
  - the level reached
  - the evidence for it
artifact_contract_verified_by: each level was checked in order and the level reached is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/verification-patterns.md
status: active
revision: 1
---

# Check existence, then substance, then wiring, then behaviour
A file existing does not mean the feature works. Verification must check:
1. **Exists** - File is present at expected path
2. **Substantive** - Content is real implementation, not placeholder
3. **Wired** - Connected to the rest of the system
4. **Functional** - Actually works when invoked
Levels 1-3 can be checked programmatically. Level 4 often requires human verification
