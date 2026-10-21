---
instruction_id: confirm-the-route-before-you-dispatch
title: Confirm the route before you dispatch
summary: The chosen route is shown and confirmed before anything is invoked.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A route to a target operation has been chosen but nothing has been invoked yet.
conditions_does_not_apply_when: The route was already confirmed in an earlier turn of the same run.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the chosen target
  - the reason
  - the confirmation
artifact_contract_verified_by: the user confirmed the route before anything was invoked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/do.md
status: active
revision: 1
---

# Confirm the route before you dispatch
Before invoking anything, ask the user to confirm the displayed route
Routing decision displayed before dispatch
**Cancel:** stop. Do not invoke any command.
**Choose a different command:** present the 2-3 next-best routes from the routing table as options and loop back through display + confirm with the new selection.
