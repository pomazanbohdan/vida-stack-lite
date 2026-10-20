---
instruction_id: key-the-cache-on-every-input-that-changes-the-response
title: Key the cache on every input that changes the response
summary: "Tenant, locale, permissions and feature flags belong in the key, because a key that omits the viewer serves one user's data to another."
capability_tags:
  - improve-runtime-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: You put a cache in front of something that varies per caller.
conditions_does_not_apply_when: The response is identical for every caller.
artifact_contract_output_type: cache-key
artifact_contract_required_data:
  - the inputs the response depends on
  - the key that carries them
artifact_contract_verified_by: every input that changes the response appears in the key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 1
---

# Key the cache on every input that changes the response

Every input that changes the response belongs in the key (tenant, locale, permissions, feature flags): a key that omits the viewer is how one user's data gets served to another.
