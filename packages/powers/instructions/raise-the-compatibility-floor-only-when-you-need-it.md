---
instruction_id: raise-the-compatibility-floor-only-when-you-need-it
title: Raise the compatibility floor only when you need it
summary: "The supported range is raised when the new behaviour is genuinely required, and the downgrade table is updated in the same change."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - migration-strategy
conditions_applies_when: The minimum supported host version is being changed.
conditions_does_not_apply_when: The change does not need a newer host version.
artifact_contract_output_type: compatibility-floor-change
artifact_contract_required_data:
  - the new floor
  - the downgrade entry that was added
artifact_contract_verified_by: the floor was raised only where the new behaviour is required and the downgrade entry was added
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/version-a-capability.md
status: active
revision: 1
---

# Raise the compatibility floor only when you need it
Do not raise it pre-emptively; only raise it when the capability genuinely requires the newer behaviour.
Add a new entry **only when you change `engines.gsd`**
A `compatVersions` entry is not meaningful for a capability distributed as a bare tarball URL (a tarball exposes a single version and cannot be auto-selected from a table); it is only actionable for sources that enumerate versions: git tags, a registry, or npm.
