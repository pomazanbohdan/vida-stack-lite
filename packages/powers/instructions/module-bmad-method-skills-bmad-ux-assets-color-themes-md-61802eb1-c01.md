---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-ux-assets-color-themes-md-61802eb1-c01"
title: "bmad-method: skills/bmad-ux/assets/color-themes.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-ux/assets/color-themes.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-ux/assets/color-themes.md\"}"
atom_ids:
  - make-each-variation-a-different-personality-not-a-recolouring
  - make-the-mock-render-fully-offline
atom_count: 2
atoms: "[{\"atom_id\":\"make-each-variation-a-different-personality-not-a-recolouring\",\"file_sha256\":\"137f7dcda3eeb5b7c8cd6dc861d545b145f1ed0d7504962cf49e206c9e21f207\",\"content_sha256\":\"8dea1b9d04aa056af19b9c90839755383659c5f4b1789ccf37bde57b10f2a8ba\",\"file_bytes\":1617,\"body_bytes\":321},{\"atom_id\":\"make-the-mock-render-fully-offline\",\"file_sha256\":\"29c5abbd369e86e9b2e1e2b9bb18f80cf4d7425f95d6326c91065c01b33862a2\",\"content_sha256\":\"e6a283e89a2c4cd5cf8441bae0b974e6f2cdbbce4453666748ff19886fbcd311\",\"file_bytes\":1460,\"body_bytes\":128}]"
carrier_sha256: ff5eb2f1de59eea4d2101c429dbb78a3a9fea95831abee09889dddaa54ac417e
carrier_bytes: 3382
revision: 1
status: active
---
<!-- vpmodule:atom:begin make-each-variation-a-different-personality-not-a-recolouring -->
---
instruction_id: make-each-variation-a-different-personality-not-a-recolouring
title: "Make each variation a different personality, not a recolouring"
summary: "Each direction is a complete visual personality applied to the same screen; the variations differ in register, not only in hue."
capability_tags:
  - generate-idea-variations
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Several visual directions or themes are produced for the user to choose from.
conditions_does_not_apply_when: One direction is confirmed and only needs to be produced.
artifact_contract_output_type: variation-set
artifact_contract_required_data:
  - the screen every variation is applied to
  - the register that differs
  - the palette that differs
artifact_contract_verified_by: no two variations differ only in hue
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/color-themes.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/design-directions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Make each variation a different personality, not a recolouring
Each direction is a *complete visual personality* applied to the same key screen — not a palette swap. Differ on density, type weight, motion implication, brand register.
Avoid near-identical pastels — variations must differ in register, not just hue.
<!-- vpmodule:atom:end make-each-variation-a-different-personality-not-a-recolouring -->
<!-- vpmodule:atom:begin make-the-mock-render-fully-offline -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/color-themes.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/design-directions.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/key-screens.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Make the mock render fully offline
Inline CSS only, system font stack, no JS, no network.
The mock must render fully offline.
<!-- vpmodule:atom:end make-the-mock-render-fully-offline -->