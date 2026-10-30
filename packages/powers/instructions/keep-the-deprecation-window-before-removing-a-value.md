---
instruction_id: keep-the-deprecation-window-before-removing-a-value
title: Keep the deprecation window before removing a value
summary: "A value that is on its way out keeps working for at least one release cycle, is marked with its successor and its removal version, and the sentinel that means unknown is never deprecated."
capability_tags:
  - decide-on-deprecation
pattern_tags:
  - deprecation-decision
conditions_applies_when: A published value or shape is being taken out of a contract.
conditions_does_not_apply_when: The value was never published and no consumer can depend on it.
artifact_contract_output_type: deprecation-window
artifact_contract_required_data:
  - the deprecated value
  - the window it stays usable for
  - its successor and removal version
artifact_contract_verified_by: the value stayed usable for the window and was marked with its successor
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the deprecation window before removing a value
- A value or adapter shape is **deprecated**, not removed, for at least **one minor release cycle**.
- The old form still works at its declared version.
- The `undocumented` sentinel is never deprecated — it is the permanent fail-closed fallback for a host that omits an axis.
