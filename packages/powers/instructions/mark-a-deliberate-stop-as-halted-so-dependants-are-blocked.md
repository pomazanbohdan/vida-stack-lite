---
instruction_id: mark-a-deliberate-stop-as-halted-so-dependants-are-blocked
title: Mark a deliberate stop as halted so dependants are blocked
summary: "A plan that stopped on purpose is marked as halted, and every plan that depends on it is reported as blocked until it is resolved."
capability_tags:
  - execute-plan
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A plan stopped before it finished on purpose.
conditions_does_not_apply_when: The plan finished.
artifact_contract_output_type: halted-plan-record
artifact_contract_required_data:
  - the reason the plan stopped
  - the plans that depend on it
artifact_contract_verified_by: the plan is marked as halted and the dependants are reported as blocked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-minimal.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-standard.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary-complex.md
status: active
revision: 1
---

# Mark a deliberate stop as halted so dependants are blocked
`status: complete` is the default — the plan finished. Use `status: halted` instead when the plan reached a designed stop (a gate failure, a spike concluding without expanding into the full build, or any other intentional non-completion) and intentionally left tasks unfinished.
`halted` is machine-read: any plan whose `depends_on` (directly or transitively) names a halted plan is reported as blocked, not offered to the executor, until the halt is resolved and re-summarized as `complete`.
