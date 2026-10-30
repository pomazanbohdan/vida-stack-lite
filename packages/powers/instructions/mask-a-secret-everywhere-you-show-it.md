---
instruction_id: mask-a-secret-everywhere-you-show-it
title: Mask a secret everywhere you show it
summary: "A secret is never displayed, echoed or logged; where it is shown it is masked, a short secret is masked without a tail, and an unset value shows as unset."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: A secret is written to a configuration and later shown to a person.
conditions_does_not_apply_when: The value is not a secret.
artifact_contract_output_type: masked-secret-view
artifact_contract_required_data:
  - the masked value
  - the unset marker
artifact_contract_verified_by: "no plaintext secret appears in any question, table or log"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-integrations.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Mask a secret everywhere you show it
The UI must never display, echo, or log the plaintext value
Strings shorter than 8 characters render as `****` with no tail so a short secret does not leak a meaningful fraction of its bytes
Unset values render as `(unset)`
Plaintext is not echoed back by this workflow, not written to any log, and not displayed in error messages
