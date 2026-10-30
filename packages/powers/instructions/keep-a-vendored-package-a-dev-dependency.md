---
instruction_id: keep-a-vendored-package-a-dev-dependency
title: Keep a vendored package a dev-dependency
summary: "The vendored copy is what ships, so the package stays a dev dependency that only pins the version the copy was taken from."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A third-party package is copied into the tree.
conditions_does_not_apply_when: The package is installed normally from a registry.
artifact_contract_output_type: vendored-package-policy
artifact_contract_required_data:
  - the pinned version
  - where the vendored copy lives
artifact_contract_verified_by: the package is declared as a dev dependency and the vendored copy is what ships
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a vendored package a dev-dependency
The package that gets vendored stays pinned in `package.json` `devDependencies`, never `dependencies`.
Promoting it to `dependencies` does not make the vendored copy redundant — the installer never runs `npm install` on your behalf inside a target tree, so a runtime `dependencies` entry buys nothing there
`devDependencies` is correct precisely because the vendored copy, not the npm-resolved package, is what ships at runtime
