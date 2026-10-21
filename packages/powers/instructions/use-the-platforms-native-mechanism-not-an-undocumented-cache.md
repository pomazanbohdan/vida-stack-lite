---
instruction_id: use-the-platforms-native-mechanism-not-an-undocumented-cache
title: "Use the platform's native mechanism, not an undocumented cache"
summary: "A package is provided and consumed through the platform's own documented mechanism; reading another plugin's ephemeral cache is a workaround and is refused."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: "A package is being shipped to a platform, or a platform is being integrated."
conditions_does_not_apply_when: The platform offers no documented mechanism and a cache is the only way.
artifact_contract_output_type: native-mechanism
artifact_contract_required_data:
  - "the platform's documented mechanism"
  - the cache reading that is refused
  - why the native mechanism is the contract
artifact_contract_verified_by: "the package goes through the platform's documented mechanism and no cache is read"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/skill-mapping-matrix.md
status: active
revision: 1
---

# Use the platform's native mechanism, not an undocumented cache
- each platform's first-party packaging should provide and consume skills through the platform's *documented, native* mechanism.
- The platform's native mechanism is the contract; cache-reading is a workaround, not a fix.
