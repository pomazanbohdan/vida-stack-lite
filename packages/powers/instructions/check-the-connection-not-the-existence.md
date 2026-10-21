---
instruction_id: check-the-connection-not-the-existence
title: "Check the connection, not the existence"
summary: "A part that exists but is never called is a broken part; the check looks for the link, not for the file."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Parts produced by separate pieces of work are audited together.
conditions_does_not_apply_when: A single piece of work is audited on its own.
artifact_contract_output_type: integration-report
artifact_contract_required_data:
  - the connections checked
artifact_contract_verified_by: the report is about connections and not about the presence of files
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-integration-checker.compact.md
status: active
revision: 1
---

# Check the connection, not the existence
Existence ≠ Integration
Check connections, not existence. Files existing is phase-level. Files connecting is integration-level.
A "complete" codebase with broken wiring is a broken product.
Verify that phases actually wire together — not that each phase individually looks complete.
