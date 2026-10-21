---
instruction_id: state-what-the-control-does-not-protect-against
title: State what the control does not protect against
summary: "The limits of a control are written next to the control: what it does not stop, what it cannot see, and the residual risk that remains."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A control is being documented or defended.
conditions_does_not_apply_when: The control has no known limit.
artifact_contract_output_type: control-limits
artifact_contract_required_data:
  - what the control reduces
  - what it does not eliminate
  - the residual risk that remains
artifact_contract_verified_by: the limits are stated next to the control and the residual risk is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/security-model.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gate-predicates.md
status: active
revision: 1
---

# State what the control does not protect against
- **What the prompt injection defences do not eliminate:** A sufficiently creative injection that does not match known patterns, or an injection that arrives through a channel the hooks do not cover.
- Defence in depth means each layer makes the attack harder, not that any single layer makes it impossible.
- The command runs as the user, on the user's machine — there is no sandbox boundary vs. the user's own shell.
