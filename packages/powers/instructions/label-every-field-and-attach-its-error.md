---
instruction_id: label-every-field-and-attach-its-error
title: Label every field and attach its error
summary: "Every field carries a visible label, and every error names the field it belongs to and is reachable by focus."
capability_tags:
  - audit-accessibility
pattern_tags:
  - accessibility-compliance
conditions_applies_when: A form is built or reviewed.
conditions_does_not_apply_when: The work builds no form.
artifact_contract_output_type: form-error-review
artifact_contract_required_data:
  - the field
  - its visible label
  - the error attached to it
  - how a failed submission is summarised
artifact_contract_verified_by: "every field has a visible label and every error is tied to its field, with the submission summary focusable"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/accessibility-checklist.md
status: active
revision: 1
---

# Label every field and attach its error
Every input has a visible label
Known fields use autocomplete (for example `type="email" autocomplete="email"`)
Error messages specific and associated with the field
Form submission errors summarized and focusable
