---
instruction_id: name-the-oracle-before-writing-the-assertion
title: Name the oracle before you write the assertion
summary: The kind of oracle the test uses is stated before the assertion is written; a crash-only oracle is never used silently.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A regression assertion is about to be written.
conditions_does_not_apply_when: The assertion already exists and only its result is read.
artifact_contract_output_type: oracle-statement
artifact_contract_required_data:
  - the oracle type
  - what the oracle checks
  - the reason when it is the weakest one
artifact_contract_verified_by: the oracle is named before the assertion exists and a crash-only oracle is justified
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/debugger-repro-hardening.md
status: active
revision: 1
---

# Name the oracle before you write the assertion
Before writing the regression assertion, **state which oracle the test uses**.
Specified — the spec/contract states the expected behavior directly
Derived (contract/model) — derived from a contract or a reference model
Metamorphic — no precise oracle exists (renderers, optimizers, ML); check a *relation* between related inputs
Implicit (crash) — the only oracle is "doesn't crash / terminates / no exception thrown."
**This is the weakest oracle.** It proves almost nothing about correctness.
Never default to it silently — if implicit is the best available, state it explicitly and justify why no stronger oracle is possible.
The discipline's point: forcing the choice surfaces a weak oracle before the fix lands
