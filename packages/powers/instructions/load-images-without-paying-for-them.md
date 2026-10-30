---
instruction_id: load-images-without-paying-for-them
title: Load images without paying for them
summary: "Images are served in a modern format, sized responsively, given their dimensions, and only loaded eagerly when they are the largest thing on the page."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A page ships images.
conditions_does_not_apply_when: The work ships no images.
artifact_contract_output_type: image-loading-review
artifact_contract_required_data:
  - the format
  - the responsive sizes
  - the dimensions
  - the loading priority
artifact_contract_verified_by: "every image has a format, a size, explicit dimensions and a loading strategy"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Load images without paying for them
Images use modern formats (WebP, AVIF)
Images are responsively sized (`srcset` and `sizes`)
Images and `<source>` elements have explicit `width` and `height` (prevents CLS in art direction)
Below-the-fold images use `loading="lazy"` and `decoding="async"`
Hero/LCP images use `fetchpriority="high"` and no lazy loading
Unoptimized images | Slow LCP, wasted bandwidth | Use WebP, responsive sizes, lazy load
