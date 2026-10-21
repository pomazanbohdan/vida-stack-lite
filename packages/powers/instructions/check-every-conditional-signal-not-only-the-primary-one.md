---
instruction_id: check-every-conditional-signal-not-only-the-primary-one
title: "Check every conditional signal, not only the primary one"
summary: A primary classification does not suppress the other signals that also match.
capability_tags:
  - audit-codebase
pattern_tags:
  - dimension-sweep
conditions_applies_when: A primary classification was made and further signals are also present.
conditions_does_not_apply_when: Only the primary signal is present.
artifact_contract_output_type: classification
artifact_contract_required_data:
  - the primary classification
  - the conditional signals that also matched
artifact_contract_verified_by: "every signal that matched was applied, not only the primary one"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 1
---

# Check every conditional signal, not only the primary one
After determining primary_type, check each signal independently regardless of the primary type.
A CLI tool that is also open source with API routes still gets all three conditional docs.
