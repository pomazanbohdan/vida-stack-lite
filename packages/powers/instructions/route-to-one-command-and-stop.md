---
instruction_id: route-to-one-command-and-stop
title: Route to one command and stop
summary: "A front door detects the situation, offers the right next actions and dispatches exactly one of them; the dispatched command owns everything after that."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - program-orchestration
conditions_applies_when: An entry point must decide what happens next and hand the work over.
conditions_does_not_apply_when: The entry point is also the place where the work is done.
artifact_contract_output_type: routing-decision
artifact_contract_required_data:
  - the situation
  - the actions offered
  - the command that was dispatched
artifact_contract_verified_by: exactly one command was dispatched and the entry point did no work of its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/smart-entry.md
status: active
revision: 1
---

# Route to one command and stop
This is a launcher/router only; it never does the work itself.
Invoke the chosen action's `command`.
After invoking the command, **stop**. The dispatched command owns everything from here. Do not continue, do not chain, do not re-enter this workflow.
Show the `summary` line to orient the user, then offer the actions.
The recommended action is already first; surface it as the first option.
