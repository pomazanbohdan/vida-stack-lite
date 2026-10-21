---
instruction_id: build-before-you-regenerate-the-manifest
title: Build before you regenerate the manifest
summary: "A manifest derived from the compiled tree is regenerated after the build, or it silently omits what was just added."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A generated manifest is refreshed after a change to the compiled tree.
conditions_does_not_apply_when: The manifest is derived from the sources directly.
artifact_contract_output_type: manifest-regeneration-order
artifact_contract_required_data:
  - the build step
  - the manifest that was regenerated
artifact_contract_verified_by: the manifest was regenerated after the build and describes the new file
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/vendor-a-dependency.md
status: active
revision: 1
---

# Build before you regenerate the manifest
If you regenerate the inventory manifest before building, the generator either misses your new vendored file or captures a stale prior build's contents.
Running step 3 before step 1/2 produces a manifest that silently omits or misdescribes the new vendored file, and that drift is exactly what the manifest gate exists to catch on someone else's PR instead of yours.
