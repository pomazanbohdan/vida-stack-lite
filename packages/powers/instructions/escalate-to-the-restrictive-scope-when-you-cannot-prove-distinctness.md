---
instruction_id: escalate-to-the-restrictive-scope-when-you-cannot-prove-distinctness
title: Escalate to the restrictive scope when you cannot prove distinctness
summary: "When two roots cannot be shown to be different, the more restrictive scope wins; the trusted scope is never granted on an unproven distinction."
capability_tags:
  - harden-security-controls
pattern_tags:
  - safe-defaults
conditions_applies_when: "Two installation roots resolve to the same directory, or their distinctness cannot be proven."
conditions_does_not_apply_when: The two roots are provably different directories.
artifact_contract_output_type: scope-escalation
artifact_contract_required_data:
  - the roots that were compared
  - the scope that was chosen
  - the control that the stricter scope requires
artifact_contract_verified_by: the stricter scope was chosen and the trusted scope was not granted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Escalate to the restrictive scope when you cannot prove distinctness
- When the global and project roots resolve to the same physical directory (or distinctness cannot be proven), the surviving scope escalates to the more restrictive `project` — consent-required.
- This is a deliberately conservative choice: when GSD cannot prove a global root is distinct from your project tree, it treats it as project-scoped rather than risk granting trusted-global activation to repo-plantable content.
