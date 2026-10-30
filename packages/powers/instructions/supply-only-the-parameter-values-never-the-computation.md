---
instruction_id: supply-only-the-parameter-values-never-the-computation
title: "Supply only the parameter values, never the computation"
summary: The agent fills in the values of the declared parameters and never writes the computation; the attester rebuilds the same binding and compares it with what actually ran.
capability_tags:
  - verify-work-results
pattern_tags:
  - attested-computation
conditions_applies_when: A sanctioned computation is about to be run with supplied values.
conditions_does_not_apply_when: The computation is being written for the first time.
artifact_contract_output_type: parameter-binding
artifact_contract_required_data:
  - the declared parameters
  - the values supplied
  - the binding the attester re-derived
artifact_contract_verified_by: only values were supplied and the re-derived binding matches the receipt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Supply only the parameter values, never the computation
The agent MAY only supply *values* for the declared `parameters`; it MUST NOT author or edit the computation.
Binding `computation` with the parameter values into the executable artifact is the consumer's job, and the attester independently re-derives that same binding to compare against what actually ran.
Because the comparison is on the expanded, compiled artifact the receipt carries (`executed_sql`, `compiled_sql`), a rewritten query, a swapped computation file, or a mutated dependency fails the check.
A typed, parameter-only surface is what makes "did the sanctioned thing run" a mechanical comparison rather than a judgement call.
