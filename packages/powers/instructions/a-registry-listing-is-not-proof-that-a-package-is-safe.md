---
instruction_id: a-registry-listing-is-not-proof-that-a-package-is-safe
title: A registry listing is not proof that a package is safe
summary: "A package found in a search or in memory stays unverified until an authoritative source confirms it, whatever the registry says."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A package is proposed for installation.
conditions_does_not_apply_when: The package was confirmed in the official documentation of the project.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the package
  - its verdict
  - its tag
artifact_contract_verified_by: the verdict follows the authoritative confirmation and not the registry lookup alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-phase-researcher.md
status: active
revision: 1
---

# A registry listing is not proof that a package is safe
Registry existence alone does not confer `[VERIFIED]` status — a slopsquatted package also passes `npm view`.
A package name discovered via WebSearch, training data, or any non-authoritative source must be tagged `[ASSUMED]` regardless of whether `npm view` confirms it exists on the registry.
Packages discovered via WebSearch or training data and not yet verified must be tagged `[ASSUMED]` regardless of registry existence (a slopsquatted package also passes registry lookup).
