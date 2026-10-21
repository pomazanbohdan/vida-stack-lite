---
instruction_id: backstop-an-edge-with-a-held-out-test
title: Backstop an edge with a held-out test
summary: An edge whose correct behaviour cannot yet be articulated is carried as a non-inferable check that a held-out test will stand in for.
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A boundary matters but the exact contract cannot be written yet.
conditions_does_not_apply_when: The exact behaviour can be stated as a pass or fail check.
artifact_contract_output_type: edge-backstop-record
artifact_contract_required_data:
  - the edge
  - the held-out test that stands in for it
artifact_contract_verified_by: the edge is carried into the plan as a check that no test can infer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/resolve-edge-coverage-findings.md
status: active
revision: 1
---

# Backstop an edge with a held-out test
Claude marks the edge `backstop` and notes that a held-out / property-based test stands in for the missing assertion.
A `backstop` edge is also carried into the plan's `must_haves.truths` as a non-inferable check — the planner records the intent, and the test body is authored later during execution.
