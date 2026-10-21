---
instruction_id: load-the-candidate-in-isolation-before-vendoring-it
title: Load the candidate in isolation before vendoring it
summary: "The candidate artifact is loaded on its own, outside the normal resolution, to prove it needs no sibling file."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: An upstream artifact is chosen for vendoring.
conditions_does_not_apply_when: The artifact is already vendored.
artifact_contract_output_type: candidate-verification
artifact_contract_required_data:
  - the upstream artifact
  - the isolation check that loaded it
artifact_contract_verified_by: the artifact loaded in isolation without reaching for a sibling file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 1
---

# Load the candidate in isolation before vendoring it
You need a **self-contained CJS or UMD bundle** — one file, loadable with a single `require()`, containing zero `require()` calls of its own to anything outside Node builtins.
Do not reach for the package's `exports.require`/`main` entry point (often `index.js`) without checking it first: that entry is frequently a thin loader that `require()`s several sibling files, which is exactly the shape vendoring cannot tolerate
Verify your candidate the same way: `require()` it in isolation (outside this repo's `node_modules` resolution, e.g. from a scratch directory with only that one file present) and confirm it loads without reaching for a sibling file.
