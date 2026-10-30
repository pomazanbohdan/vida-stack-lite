---
instruction_id: read-the-new-field-and-fall-back-to-the-old-one
title: Read the new field and fall back to the old one
summary: "When a field is superseded, the consumer reads the new field and falls back to the legacy one while documents of the old form still exist."
capability_tags:
  - curate-context
pattern_tags:
  - permissive-conformance
conditions_applies_when: A consumer reads documents in which a field has been superseded.
conditions_does_not_apply_when: No document of the old form exists any more.
artifact_contract_output_type: version-tolerant-read
artifact_contract_required_data:
  - the new field
  - the legacy fallback
  - the documents that used the legacy form
artifact_contract_verified_by: the new field is read first and the legacy field is read only when the new one is absent
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

# Read the new field and fall back to the old one
Consumers MAY fall back to a legacy `timestamp` when `generated` is absent.
Consumers SHOULD read `sources` and MAY still parse a legacy `# Citations` body list for v0.1 documents.
