---
instruction_id: keep-every-versioned-manifest-in-step-with-the-package-version
title: Keep every versioned manifest in step with the package version
summary: Every manifest that carries a version field matches the package version; a new one is registered and a regression test fails when an unregistered manifest is found.
capability_tags:
  - integrate-branch
pattern_tags:
  - package-lifecycle
conditions_applies_when: "A release is cut, or a new manifest that carries a version field is added."
conditions_does_not_apply_when: The repository has no manifest with a version field.
artifact_contract_output_type: manifest-version-sync
artifact_contract_required_data:
  - the manifests that carry a version field
  - the package version they must match
  - the registry entry for each such manifest
artifact_contract_verified_by: the regression test finds no committed manifest with a version field that is missing from the registry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=VERSIONING.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep every versioned manifest in step with the package version
Certain runtime-integration manifests carry a `version` field that must always match `package.json`:
- the plugin manifest
- the marketplace manifest; its version lives at `plugins[0].version`
- the extension manifest
The `version` lifecycle script
stamps these files automatically
and stages them so they are included in the release commit alongside `package.json`.
To add a new manifest that must track the package version, register its path (and, if its version field is not top-level, its dotted `versionKey`)
A regression test enforces this:
it scans all committed JSON files for a matching `version` field and fails if any are missing from the registry.
