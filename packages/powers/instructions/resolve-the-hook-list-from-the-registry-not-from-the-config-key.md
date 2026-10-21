---
instruction_id: resolve-the-hook-list-from-the-registry-not-from-the-config-key
title: "Resolve the hook list from the registry, not from the config key"
summary: "A consumer resolves the effective hooks through the registry; it never branches on the raw activation key, because the key alone does not say whether the hook runs."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A consumer needs to know which hooks are active.
conditions_does_not_apply_when: The consumer reads the activation key directly and calls it active.
artifact_contract_output_type: registry-resolution
artifact_contract_required_data:
  - the entry point that resolves the hooks
  - the two conditions that make a hook active
  - the key that must not be branched on
artifact_contract_verified_by: the hooks were resolved through the registry and not by branching on the activation key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/review-verification-capabilities.md
status: active
revision: 1
---

# Resolve the hook list from the registry, not from the config key
- Workflows must not branch directly on the boolean activation keys. Workflows resolve activation by calling `gsd-tools loop render-hooks <point>`.
- The resolver evaluates each hook's `when` key against the project config and the capability config default. If the key is absent and the capability declaration default is `true`, the hook is configured on.
