---
instruction_id: never-guess-when-a-capability-cannot-be-verified
title: Never guess when a capability cannot be verified
summary: "A capability that cannot be resolved is never guessed: the resolver fails closed, the failure is kept apart from a genuine \"none\", and the run halts rather than answering \"safe\"."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
  - halt-on-missing-precondition
conditions_applies_when: "A capability, isolation mode or procedure selection must be resolved before the work starts."
conditions_does_not_apply_when: The capability is resolved and the answer is unambiguous.
artifact_contract_output_type: capability-resolution
artifact_contract_required_data:
  - the capability asked for
  - the answer or the reason it could not be answered
  - the branch taken
artifact_contract_verified_by: "the branch taken follows an answered question, and an unanswered question is reported as unanswered"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/per-plan-executor-routing.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/tdd-applicability-resolution.md
status: active
revision: 1
---

# Never guess when a capability cannot be verified
Refusing to dispatch rather than guess (a guard that cannot verify must not answer 'safe').
Resolves whether this dispatch is TDD — fail closed, do not guess.
Refusing to guess whether this dispatch needs the TDD procedure.
fails closed to the default executor when the named agent does not resolve or on any error, so a missing or misspelled hint never blocks dispatch
