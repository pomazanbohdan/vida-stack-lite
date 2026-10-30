---
instruction_id: give-each-computation-its-own-trust-state
title: Give each computation its own trust state
summary: "A sanctioned computation is its own document, so that every figure verifies, expires and attests on its own."
capability_tags:
  - write-knowledge-documents
pattern_tags:
  - attested-computation
conditions_applies_when: A corpus states how a value is computed and how each figure is confirmed.
conditions_does_not_apply_when: The value is computed by the reader itself.
artifact_contract_output_type: computation-concept
artifact_contract_required_data:
  - the computation document
  - the trust state of each figure
artifact_contract_verified_by: each figure has its own document and its own verification and expiry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - business
---

# Give each computation its own trust state
A sanctioned computation is a standalone concept of `type: Attested Computation`.
**Trust state is per computation.**
`verified`, `stale_after`, and a single `attester` describe one thing.
Revenue, profit, and margin each verify and attest independently, which is three concepts, not three entries in one frontmatter.
**One computation, many consumers.**
The same computation can back a metric, a dashboard concept, and a report; as a concept it is referenced once and reused.
**`runtime` defines what `parameters` mean.**
A parameter is a SQL bind variable, a dbt var, or a Python argument depending on the runtime.
