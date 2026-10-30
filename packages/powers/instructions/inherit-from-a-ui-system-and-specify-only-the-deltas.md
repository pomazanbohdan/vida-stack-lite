---
instruction_id: inherit-from-a-ui-system-and-specify-only-the-deltas
title: Inherit from a UI system and specify only the deltas
summary: "When the foundation names a UI system, both documents inherit from it: reference the system tokens by name instead of restating them, and state only the delta — brand colour overrides, typography swaps, component customisations."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: The design is built on an existing UI system.
conditions_does_not_apply_when: The design starts from no system.
artifact_contract_output_type: inheritance-delta
artifact_contract_required_data:
  - the named system
  - the deltas
artifact_contract_verified_by: no value from the system is restated and every delta is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Inherit from a UI system and specify only the deltas
When Foundation names a UI system (shadcn, MUI, native UIKit, Compose, internal design system), both spines inherit from it; DESIGN.md tokens reference or extend the system's defaults, EXPERIENCE.md specifies only the behavioral delta.
When inheriting from shadcn / MUI / Tailwind / internal design system, reference the system's tokens by name rather than restating values. DESIGN.md specifies only the deltas (brand color overrides, typography swaps, component customizations).
