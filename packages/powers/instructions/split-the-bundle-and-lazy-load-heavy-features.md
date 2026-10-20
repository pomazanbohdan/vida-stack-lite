---
instruction_id: split-the-bundle-and-lazy-load-heavy-features
title: Split the bundle and lazy-load heavy features
summary: "Route-level code splitting and lazy loading are the real gains, because modern bundlers already tree-shake named ESM imports."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The initial bundle carries code the first page does not need.
conditions_does_not_apply_when: The bundle was not measured as too large.
artifact_contract_output_type: bundle-change
artifact_contract_required_data:
  - the measured bundle size
  - the feature that was split or lazy-loaded
artifact_contract_verified_by: the bundle size was measured before the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 2
---

# Split the bundle and lazy-load heavy features

Modern bundlers tree-shake ESM named imports on their own; the real gains are route-level code splitting and lazy-loading heavy, rarely-used features behind `Suspense`.
Profile before changing import styles.
