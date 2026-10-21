---
instruction_id: a-marker-in-a-directory-governs-every-file-in-it
title: A marker in a directory governs every file in it
summary: "A marker written into a directory changes how every file in that directory resolves, not only the file the marker was written for."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A marker or override is written into a directory that holds other files.
conditions_does_not_apply_when: The marker is written for one file and the directory holds only that file.
artifact_contract_output_type: marker-scope-note
artifact_contract_required_data:
  - the marker
  - the directory it governs
  - the files it reaches
artifact_contract_verified_by: the scope of the marker covers the whole directory and the trade-off is stated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/install-on-your-runtime.md
status: active
revision: 1
---

# A marker in a directory governs every file in it
shadows your config root for **every** `.js` file in that directory
