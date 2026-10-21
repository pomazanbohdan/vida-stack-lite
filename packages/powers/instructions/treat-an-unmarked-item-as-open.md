---
instruction_id: treat-an-unmarked-item-as-open
title: Treat an unmarked item as open
summary: A deferred item counts as resolved only when it says so; an item without that mark is surfaced.
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Deferred items are read to see which of them are still open.
conditions_does_not_apply_when: Every deferred item carries its status.
artifact_contract_output_type: deferred-item-audit
artifact_contract_required_data:
  - each unresolved item
  - the explicit mark that would close it
artifact_contract_verified_by: every item without an explicit resolved mark was surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress/steps/forensic-audit.md
status: active
revision: 1
---

# Treat an unmarked item as open
every other entry — including one with no status: field at all — is UNRESOLVED and must be surfaced (fail-safe: never silently drop a possibly-open item).
