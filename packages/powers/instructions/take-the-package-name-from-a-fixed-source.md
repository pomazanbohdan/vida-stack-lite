---
instruction_id: take-the-package-name-from-a-fixed-source
title: Take the package name from a fixed source
summary: "The name of the package that is looked up comes from a constant in the code, never from a free choice made while the command runs."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A package registry is queried for a version.
conditions_does_not_apply_when: The package name is fixed by the caller.
artifact_contract_output_type: package-lookup
artifact_contract_required_data:
  - the package name and where it came from
  - the version that was found
artifact_contract_verified_by: the queried package name is the one the code holds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Take the package name from a fixed source
**Do NOT run `npm view` or `npm search` directly** — the package name must come from the script, not from a free choice at execution time.
