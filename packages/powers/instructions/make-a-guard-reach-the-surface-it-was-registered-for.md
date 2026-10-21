---
instruction_id: make-a-guard-reach-the-surface-it-was-registered-for
title: Make a guard reach the surface it was registered for
summary: "The gate and its registration agree in both directions; a hole is closed because it can open, not because nothing was found in it today."
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A check is registered on a set of files and paths.
conditions_does_not_apply_when: The check covers every file it is meant to cover.
artifact_contract_output_type: guard-surface-coverage
artifact_contract_required_data:
  - the surface the guard is registered on
  - the part of the surface the guard skipped
  - the test that pins the two in both directions
artifact_contract_verified_by: the guard and the registration agree in both directions and a test pins it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md
status: active
revision: 1
---

# Make a guard reach the surface it was registered for
The rule short-circuited unless a file's path matched a flat `src/*.cts` pattern, so it **self-gated on its own filename**.
Both halves now move together, and a test pins that the gate and the registration agree in *both* directions.
The `src/` subdirectory hole was **latent** — zero violations existed there when it was fixed.
It is closed because "no violations today" is not a property that keeps holding, not because it was hiding anything.
The rule now also covers `tests/**` and `scripts/**`, which surfaced **80 hand-rolled markdown parses across 43 test files**.
Seventy are routed through the existing `markdown-sectionizer` and `markdown-table` seams; ten are suppressed with a stated reason
The 10 suppressions are suppressions, not fixes. Each names why the raw markdown text is the subject of that assertion.
Found by the widening: `tests/config-field-docs.test.cjs` asserted that `workflow.subagent_timeout`'s documented default is not `600` — but read the **Type** column instead of **Default**, so it compared `'number'` against `'600'` and could never fail.
The guard against regressing to the old seconds-based default had been inert.
