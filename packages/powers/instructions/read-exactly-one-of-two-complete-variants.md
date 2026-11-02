---
instruction_id: read-exactly-one-of-two-complete-variants
title: Read exactly one of two complete variants
summary: "When a full and a short version of the same thing both stand on their own, exactly one is read and never one as an addition to the other."
capability_tags:
  - curate-context
pattern_tags:
  - verified-loading
conditions_applies_when: A reference exists in a full and in a short form.
conditions_does_not_apply_when: Only one form exists.
artifact_contract_output_type: variant-selection
artifact_contract_required_data:
  - the form that was read
  - the form that was skipped
  - the reason one was enough
artifact_contract_verified_by: exactly one form was read and the other was not used as an addition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/compact-content-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Read exactly one of two complete variants
Both files are complete, independently — Read exactly one, never both, and never read the compact sibling's content as an addendum to the canonical file.
rather than silently serving canonical with no signal at all.
This rule is scoped per call site, not per file.
Before wiring any call site, confirm by inspection which kind it is
