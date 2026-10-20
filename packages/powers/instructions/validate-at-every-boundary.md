---
instruction_id: validate-at-every-boundary
title: Validate at every boundary
summary: "After removing the cause of a failure, add checks at every layer the data crosses, so the same failure cannot return by another path."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: Invalid or missing data crossed several components and caused the failure.
conditions_does_not_apply_when: The cause is already removed in one place and no other data path exists.
artifact_contract_output_type: layered-validation
artifact_contract_required_data:
  - data path
  - list of boundaries
  - checks at each boundary
  - blocking evidence
artifact_contract_verified_by: bypass tests at each layer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/systematic-debugging/defense-in-depth.md
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/principle-boundary-discipline/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-toolsmith/shapes/rendered-skill/shape.md
status: active
revision: 3
---

# Validate at every boundary
When you fix a bug caused by invalid data, adding validation in one place feels sufficient. A single check can be bypassed by a different code path, a refactoring, or a mock.
Validate at every layer the data passes through. Make the bug structurally impossible.
Single validation says we fixed the bug. Multiple layers say we made the bug impossible.
Different layers catch different cases: entry validation catches most bugs, business logic catches edge cases, environment guards prevent context-specific dangers, and debug logging helps when other layers fail.
Entry point validation rejects obviously invalid input at the boundary.
Business logic validation ensures that data makes sense for this operation.
Environment guards prevent dangerous operations in specific contexts.
Debug instrumentation captures context for forensics.
Trace the data flow: where the bad value originated and where it is used. Map every checkpoint the data passes through. Add validation at each layer. Test each layer by trying to bypass the previous one.
Place validation, type narrowing, and error handling at system boundaries: command-line arguments, configuration files, external APIs, and network protocols.
Inside the system, trust the types, propagate errors, and do not re-validate.
Expose domain concepts across the boundary, not the boundary's private representation.
Keep general-purpose mechanism inside and special-purpose policy at the edge.
Parse raw data into domain types at the boundary. Validate configuration at parse time, not inside business logic.
No redundant nil checks deep in call chains when the boundary already validated.
Business logic lives in pure functions with no framework dependencies. The shell is thin and mechanical.
Ask whether the data is crossing a system boundary right now. If not, validation is redundant.
Ask whether the logic can be a pure function that the shell just calls. If yes, extract it.
A configured value the workflow cannot act on, such as a misspelled selector, is rejected before the first step, one guard per selector.
