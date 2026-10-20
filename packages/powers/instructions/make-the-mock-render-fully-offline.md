---
instruction_id: make-the-mock-render-fully-offline
title: Make the mock render fully offline
summary: "A mock is self-contained: inline styles, system fonts, no script and no network."
capability_tags:
  - design-user-interface
pattern_tags:
  - output-formatting
conditions_applies_when: A visual mock or a theme page is produced as a file.
conditions_does_not_apply_when: The artefact is rendered by the product itself and needs no standalone form.
artifact_contract_output_type: mock-file
artifact_contract_required_data:
  - the styles inlined in the file
  - the fonts used
  - the network and script budget of zero
artifact_contract_verified_by: the file renders the mock with no network and no script
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/assets/color-themes.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/assets/design-directions.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/assets/key-screens.md
status: active
revision: 1
---

# Make the mock render fully offline
Inline CSS only, system font stack, no JS, no network.
The mock must render fully offline.
