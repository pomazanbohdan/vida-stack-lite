---
instruction_id: test-concurrency-through-a-controlled-clock
title: Test concurrency through a controlled clock
summary: "Concurrency is tested through an injectable clock seam, never through real scheduler races; a racing test is deleted once the deterministic one covers the same path."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: "The code under test decides anything on a timer, a deadline or a lock expiry."
conditions_does_not_apply_when: The code has no time-dependent branch.
artifact_contract_output_type: concurrency-test
artifact_contract_required_data:
  - the clock seam the test controls
  - the time the test sets
  - the deterministic test that replaced a racing test
artifact_contract_verified_by: the timing branch is exercised through a controlled clock and no test outcome depends on OS scheduler timing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/456-test-rigor-architecture.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Test concurrency through a controlled clock
Concurrency logic must be tested via an **injectable clock seam** backed by `node:test` `mock.timers`, not by real OS scheduler races.
Wall-clock timing in production code paths that cannot accept an injectable clock (e.g., third-party integrations) must be wrapped behind an adapter interface so tests can substitute a controlled clock.
Real multi-process race tests (where two OS processes genuinely compete for a resource) are **deleted** once the corresponding deterministic clock-seam test covers the same logical path.
They are not quarantined or skipped — deleted.
A deleted racing test must be replaced by a deterministic seam test in the same commit.
Real OS scheduler races are non-deterministic on loaded CI runners and are not a permitted test pattern regardless of which mechanism applies.
