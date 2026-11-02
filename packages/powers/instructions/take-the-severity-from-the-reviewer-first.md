---
instruction_id: take-the-severity-from-the-reviewer-first
title: Take the severity from the reviewer first
summary: "The severity of a finding is the one the reviewer stated, and only then a recorded value or an inference."
capability_tags:
  - review-code
pattern_tags:
  - finding-severity-policy
conditions_applies_when: "A finding's severity is being recorded or carried forward."
conditions_does_not_apply_when: The severity was never stated by anyone and cannot be inferred.
artifact_contract_output_type: finding-ledger
artifact_contract_required_data:
  - the finding
  - its severity
  - where the severity came from
artifact_contract_verified_by: "the severity comes from the reviewer's own statement of it before any inference"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/code-review-disposition.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Take the severity from the reviewer first
SEVERITY COMES FROM THE SECTION FIRST, the recorded ledger value second, the id prefix third
The section heading is the reviewer's OWN statement of a finding's severity
an unrecognized ## section falls back to the prefix
The Severity column is the whole basis for triaging the ledger, so it has to agree with the document it describes.
SEVERITY, READ BACK.
