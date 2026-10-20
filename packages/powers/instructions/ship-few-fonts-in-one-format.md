---
instruction_id: ship-few-fonts-in-one-format
title: Ship few fonts in one format
summary: "A small number of font families and weights ship in one modern format, self-hosted where possible, with the fallback metrics adjusted."
capability_tags:
  - improve-web-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A page uses custom fonts.
conditions_does_not_apply_when: The page uses only a system font stack.
artifact_contract_output_type: font-loading-review
artifact_contract_required_data:
  - the families and weights
  - the format
  - where the font is served from
  - the fallback metrics
artifact_contract_verified_by: the font budget is stated and every font file is in the one supported format
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
---

# Ship few fonts in one format
Limited to 2–3 font families, 2–3 weights each (every additional weight is another request)
WOFF2 format only (smallest, universal support — skip WOFF/TTF/EOT)
Self-hosted when possible (third-party font CDNs add DNS + TCP + TLS round-trips)
LCP-critical fonts preloaded: `<link rel="preload" as="font" type="font/woff2" crossorigin>`
`font-display: swap` (or `optional` for non-critical) to avoid FOIT blocking render
Subsetted via `unicode-range` to ship only the glyphs each page needs
Variable fonts considered when multiple weights/styles are required (one file replaces many)
Fallback font metrics adjusted with `size-adjust`, `ascent-override`, `descent-override` to reduce CLS on font swap
System font stack considered before any custom font
