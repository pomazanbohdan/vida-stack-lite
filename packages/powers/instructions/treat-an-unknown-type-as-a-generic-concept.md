---
instruction_id: treat-an-unknown-type-as-a-generic-concept
title: Treat an unknown type as a generic concept
summary: A consumer that meets a type it does not know handles the document as a generic concept instead of rejecting it.
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer reads a document whose type it does not recognise.
conditions_does_not_apply_when: The type is one the consumer knows.
artifact_contract_output_type: tolerated-document
artifact_contract_required_data:
  - the unknown type
  - the generic handling the document received
artifact_contract_verified_by: the unknown type was tolerated and the document was not rejected
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
---

# Treat an unknown type as a generic concept
Consumers MUST tolerate unknown types gracefully, typically by treating them as generic concepts.
- Unknown `type` values.
