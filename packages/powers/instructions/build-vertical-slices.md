---
instruction_id: build-vertical-slices
title: Build vertical slices
summary: "Work one vertical slice at a time: one test, one minimal implementation, each slice a tracer bullet through every layer."
capability_tags:
  - write-tests-first
pattern_tags:
  - vertical-slicing
conditions_applies_when: A feature or fix is built test-first and could be sliced horizontally or vertically.
conditions_does_not_apply_when: The work is a single trivial change.
artifact_contract_output_type: vertical-slice
artifact_contract_required_data:
  - slice
  - one test
  - minimal implementation
artifact_contract_verified_by: each slice is demoable on its own and the suite stays green after it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=matt-skills; license=MIT; revision=49dd158d1076134a641b33efb035946536778336; path=skills/engineering/tdd/SKILL.md
status: active
revision: 1
---

# Build vertical slices
- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage, not the red → green implementation cycle.
Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.
**Horizontal slicing** (writing all tests first, then all implementation) verifies _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation.
