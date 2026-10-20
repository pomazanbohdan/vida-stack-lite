---
instruction_id: give-images-dimensions-and-priority
title: Give images dimensions and priority
summary: "Every image declares its dimensions, the largest-contentful-paint image is high priority with modern formats and responsive sizes, and the images below the fold load lazily."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A page ships images.
conditions_does_not_apply_when: The work ships no image.
artifact_contract_output_type: image-policy
artifact_contract_required_data:
  - the dimensions
  - the priority
  - the formats
  - the loading mode
artifact_contract_verified_by: every image declares its width and height and its loading mode matches its position on the page
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 2
---

# Give images dimensions and priority

Every image declares `width` and `height` (CLS).
The LCP image gets `fetchpriority="high"`, modern formats (AVIF, WebP) through `<picture>`, and `srcset`/`sizes` for resolution switching; below-the-fold images get `loading="lazy"` and `decoding="async"`.
