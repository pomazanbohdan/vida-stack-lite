---
instruction_id: confirm-a-visual-reference-for-every-surface
title: Confirm a visual reference for every surface
summary: "Walk every surface of the map and classify it as mocked or spine-only, then ask whether the spine-only ones need a visual reference before they are built."
capability_tags:
  - design-user-interface
pattern_tags:
  - code-review
conditions_applies_when: The design is being finalised and the surfaces are known.
conditions_does_not_apply_when: The design has no surfaces.
artifact_contract_output_type: mock-coverage
artifact_contract_required_data:
  - the mocked surfaces
  - the spine-only surfaces
  - the answer to the visual-reference question
artifact_contract_verified_by: every surface is classified and the spine-only ones were asked about
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/assets/key-screens.md
status: active
revision: 2
---

# Confirm a visual reference for every surface
Walk every IA surface; classify *mocked* vs *spine-only*.
Ask: *"These will be built from spine tables alone — any need a visual reference?"*
Render more if named; log spine-only choices.
Do not show every screen of every flow — 2-4 load-bearing surfaces, not 14.
