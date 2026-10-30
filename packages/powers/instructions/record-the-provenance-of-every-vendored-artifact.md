---
instruction_id: record-the-provenance-of-every-vendored-artifact
title: Record the provenance of every vendored artifact
summary: "Each vendored artifact records which upstream file it came from, why that one and not the entry point, and how to refresh it."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - decision-trail
conditions_applies_when: A vendored artifact is added to the tree.
conditions_does_not_apply_when: The artifact is already documented.
artifact_contract_output_type: vendored-artifact-provenance
artifact_contract_required_data:
  - the upstream artifact
  - the reason it is the vendorable one
  - the refresh command
artifact_contract_verified_by: "the entry names the upstream artifact, the reason and the refresh command"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Record the provenance of every vendored artifact
Add an entry alongside the existing ones: which upstream artifact you copied, why it (and not the package's main entry point) is the vendorable one, which symbols it exposes, and the refresh command.
This is the first place a future contributor looks when `lint-vendored-deps.cjs` reports drift.
