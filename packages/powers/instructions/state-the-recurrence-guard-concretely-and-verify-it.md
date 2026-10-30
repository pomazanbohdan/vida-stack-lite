---
instruction_id: state-the-recurrence-guard-concretely-and-verify-it
title: State the recurrence guard concretely and verify it
summary: "The guard is a named artifact — a file, a rule, a test — and it is verified to exist before it is recorded."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - non-blaming-analysis
conditions_applies_when: A recurrence guard is recorded for a resolved failure.
conditions_does_not_apply_when: Nothing is being recorded for a future reader.
artifact_contract_output_type: recurrence-guard
artifact_contract_required_data:
  - the kind of guard
  - the exact location of the artifact
  - the check that shows it exists
artifact_contract_verified_by: the artifact was checked to exist before it was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-prevention.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# State the recurrence guard concretely and verify it
The **concrete artifact** that prevents this class from returning.
a **regression test** (already produced by Test-First Debugging — reference it),
an **assertion / precondition** (fail loud at runtime if the bad condition recurs),
a **type refinement** (make the bad state unrepresentable — the strongest guard in a typed codebase
a **config-default change** (eliminate the misconfiguration that enabled the bug — flip the default so the unsafe path is opt-in, not the path of least resistance),
a **lint rule / broken-window ledger entry** (fail the build / surface in review),
State the guard concretely (which file, which rule, which test name) — not "add a test" but "the regression test at `tests/foo.test.cjs:42` now covers this class."
**Verify the artifact exists before recording it** (the test passes, the type compiles, the lint rule is registered) — a stale or unverified path is worse than none, since a future Phase-0 match would surface it as if it were real.
