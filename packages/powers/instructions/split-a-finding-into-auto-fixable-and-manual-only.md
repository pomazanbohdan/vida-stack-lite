---
instruction_id: split-a-finding-into-auto-fixable-and-manual-only
title: Split a finding into auto-fixable and manual-only
summary: "Every finding is classified as auto-fixable, manual-only or skip, and the signals of each class are fixed so that two runs classify the same finding the same way."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A list of findings is about to be worked on.
conditions_does_not_apply_when: The findings were classified already.
artifact_contract_output_type: finding-classification
artifact_contract_required_data:
  - the class of each finding
  - the signal behind the class
artifact_contract_verified_by: every finding carries one of the three classes and the signal behind it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/audit-fix.md
status: active
revision: 1
---

# Split a finding into auto-fixable and manual-only
**auto-fixable** - clear code change, specific file referenced, testable fix
**manual-only** - requires design decisions, ambiguous scope, architectural changes, user input needed
**skip** - severity below the `--severity` threshold
Auto-fixable signals:
References a specific file path + line number
Describes a missing test or assertion
Missing export, wrong import path, typo in identifier
Clear single-file change with obvious expected behavior
Manual-only signals:
Uses words like "consider", "evaluate", "design", "rethink"
Requires new architecture or API changes
Ambiguous scope or multiple valid approaches
Requires user input or design decisions
Cross-cutting concerns affecting multiple subsystems
Performance or scalability issues without clear fix
