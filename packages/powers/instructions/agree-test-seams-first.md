---
instruction_id: agree-test-seams-first
title: Agree test seams first
summary: "Agree the seams under test with the user before writing any test, and note what each seam catches and misses."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-first-development
conditions_applies_when: Tests must be written and there is a choice of where to place them.
conditions_does_not_apply_when: The seam is fixed by the framework or already agreed.
artifact_contract_output_type: seam-plan
artifact_contract_required_data:
  - seams under test
  - what each catches
  - what each misses
artifact_contract_verified_by: no test is written at an unconfirmed seam
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/SKILL.md
status: active
revision: 5
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Agree test seams first
A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.
**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.
Ask: "What's the public interface, and which seams should we test?" Give each proposed seam a one-line note on what it catches and what it misses.
When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), use the shared design vocabulary for the module, interface, depth, seam, adapter, leverage and locality terms; it is a reference to consult, not a session to run.
