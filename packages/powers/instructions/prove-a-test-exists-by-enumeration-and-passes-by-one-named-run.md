---
instruction_id: prove-a-test-exists-by-enumeration-and-passes-by-one-named-run
title: Prove a test exists by enumeration and passes by one named run
summary: "Existence is proved by listing the tests, passing by running the one named test; the full suite runs at most once."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A verification has to establish that a test exists and that it passes.
conditions_does_not_apply_when: The full suite already ran once in this verification.
artifact_contract_output_type: verification-evidence
artifact_contract_required_data:
  - the enumerated test
  - the named test that was run
  - its result
artifact_contract_verified_by: the suite ran at most once and no test was claimed on the strength of a filtered run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-verifier.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Prove a test exists by enumeration and passes by one named run
**Run the full workspace test command at most once per verification.** Never filter a full run per must-have (`<full-suite> 2>&1 | grep X` repeated per truth) — it re-runs everything and yields no new evidence. Prove a test exists by enumeration (`--list` / `--collect-only`); prove one passes via a single named test. If a full run is genuinely required, run it once and `grep` the saved output.
# A test EXISTS (existence proof — enumerate, do NOT run the suite)
# A specific test PASSES (run ONE named test, never the whole suite)
