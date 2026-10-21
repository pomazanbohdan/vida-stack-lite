---
instruction_id: map-every-requirement-to-its-cross-phase-path
title: Map every requirement to its cross-phase path
summary: "Each requirement is traced through the parts that carry it, and a requirement that never leaves one part is called out."
capability_tags:
  - verify-work-results
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: Requirements and the parts that implement them are audited together.
conditions_does_not_apply_when: There is only one part.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the requirement
  - its path
  - its status
artifact_contract_verified_by: every requirement has a wiring status and the unwired ones are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.compact.md
status: active
revision: 1
---

# Map every requirement to its cross-phase path
MUST map each integration finding to affected requirement IDs where applicable
Requirements with no cross-phase wiring MUST be flagged in the Requirements Integration Map
Requirements with no cross-phase wiring:
