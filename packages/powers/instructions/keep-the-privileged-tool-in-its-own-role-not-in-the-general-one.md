---
instruction_id: keep-the-privileged-tool-in-its-own-role-not-in-the-general-one
title: "Keep the privileged tool in its own role, not in the general one"
summary: The capability that reaches the browser lives in the role that needs it; the general executor carries no such reach in any configuration.
capability_tags:
  - scope-tool-reach
pattern_tags:
  - control-tiering
conditions_applies_when: A step adds a capability that only one role needs.
conditions_does_not_apply_when: Every role needs the capability.
artifact_contract_output_type: tool-scope
artifact_contract_required_data:
  - the role that carries the capability
  - the roles that do not
artifact_contract_verified_by: the capability is reachable only from the role that needs it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-live-dom-verification.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the privileged tool in its own role, not in the general one
**It does not widen the executor.** `gsd-executor` carries no browser tools in any configuration. The browser reach lives in `gsd-dom-verifier` alone.
**It never blocks.** The step is advisory by construction — it cannot fail a task, fail a wave, or stop a phase. Findings are findings; the executor still owns task outcomes.
