---
instruction_id: fail-closed-when-ownership-is-ambiguous
title: Fail closed when ownership is ambiguous
summary: "Ownership evidence decides whether a file may be rewritten; an ambiguous file blocks with a report, and a failed install restores the state it started from."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: "A tool cleans up, rewrites or installs over files it may not own."
conditions_does_not_apply_when: The ownership of every affected file is recorded.
artifact_contract_output_type: ownership-evidence
artifact_contract_required_data:
  - the ownership evidence
  - the install scope
  - the pre-install state that was restored
artifact_contract_verified_by: an ambiguous ownership blocked the destructive action and the pre-install state was restored
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/installer-migrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Fail closed when ownership is ambiguous
Legacy stale-file cleanup uses ownership evidence before deleting or rewriting.
User-owned artifacts are preserved.
block with a clear report instead of being silently overwritten.
Destructive actions MUST fail closed when ownership is ambiguous.
Migration records MUST include metadata, install scope, and ownership evidence.
Install failures MUST restore the pre-install state when rollback data exists.
Migration plans support dry-run reporting and rollback protection.
