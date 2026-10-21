---
instruction_id: fail-closed-on-an-ambiguous-gate-value
title: Fail closed on an ambiguous gate value
summary: "A gate passes only on an exact value; a missing, non-numeric or unparsable reading blocks instead of being read as a pass."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: A gate compares a recorded value against an exact expectation before the work may continue.
conditions_does_not_apply_when: The gate has no value to read and no way to obtain one.
artifact_contract_output_type: gate-verdict
artifact_contract_required_data:
  - the value that was read
  - the exact value the gate demands
  - the reason the reading is refused
artifact_contract_verified_by: the gate passes only on the exact value and refuses every other reading
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 1
---

# Fail closed on an ambiguous gate value
The gate passes **only** when `threats_open` is exactly `0`.
For any other value — `threats_open` > 0, or a missing / non-numeric / unparsable field — **fail closed** with `block: true` and `SECURITY_SHIP_GATE_OPEN_THREATS` (the predicate is strict equality to `0`; never ship on an ambiguous value):
**`WINDOWS_OPEN_COUNT` is `"?"`, empty, or non-numeric** → **fail closed** with `block: true` and `WINDOWS_SHIP_GATE_READ_FAILED` (the gate is strict equality to `0`; never ship on an unreadable ledger):
The ledger may be malformed; fix it before shipping (an unparseable ledger is a broken window).
