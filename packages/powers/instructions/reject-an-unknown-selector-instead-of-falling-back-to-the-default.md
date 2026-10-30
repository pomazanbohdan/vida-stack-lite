---
instruction_id: reject-an-unknown-selector-instead-of-falling-back-to-the-default
title: Reject an unknown selector instead of falling back to the default
summary: A selector that names nothing recognisable is refused; the switch whose whole point is that nothing fails with success must not itself fail open.
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "A mode, version or profile is selected by a value that may be wrong."
conditions_does_not_apply_when: The selector names a known value.
artifact_contract_output_type: selection-rejection
artifact_contract_required_data:
  - the rejected value
  - the reason it was refused
artifact_contract_verified_by: an unknown selector is refused loudly and no default was silently applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/adopt-the-v2-exit-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Reject an unknown selector instead of falling back to the default
Only the exact lowercase tokens `v1`/`v2` are accepted. Anything else present — a typo, `V2`, `v3`, or an explicitly empty `--exit-contract=` — throws rather than silently falling back to `v1`; a selector for a contract whose whole point is "nothing fails with success" must not itself fail open.
