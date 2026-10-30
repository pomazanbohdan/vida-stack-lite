---
instruction_id: inherit-the-parent-invariants-as-binding
title: Inherit the parent invariants as binding
summary: "Load the parent contract first, treat its decisions as read-only constraints, and decide only what the parent left open."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A contract is being written below one that already exists.
conditions_does_not_apply_when: "There is no parent contract, or the parent is being replaced rather than extended."
artifact_contract_output_type: inherited-invariants
artifact_contract_required_data:
  - the inherited decisions
  - the constraint entries
  - the open items
  - the conflicts
artifact_contract_verified_by: the inherited decisions are listed unrenumbered and every new decision either avoids or surfaces a conflict with them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-architecture/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Inherit the parent invariants as binding
load the parent spine first and treat its `AD`s, conventions, and paradigm as **binding, read-only** constraints
log each as a `constraint` entry, list them under the spine's *Inherited Invariants* (parent `AD` IDs, never renumbered), and don't re-derive them.
Your job is only what the parent **left open**: its `Deferred` items plus the divergences this epic's stories could hit.
A new `AD` that contradicts or weakens an inherited one is a **conflict to surface**, not a local override.
An epic spine fixes the invariants the epic's stories must share — it does **not** expand per-story detail.
