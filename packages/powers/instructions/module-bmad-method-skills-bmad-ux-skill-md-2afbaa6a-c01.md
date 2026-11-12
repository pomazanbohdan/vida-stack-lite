---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-ux-skill-md-2afbaa6a-c01"
title: "bmad-method: skills/bmad-ux/SKILL.md module"
summary: "Carrier for 8 atomic instructions from bmad-method:skills/bmad-ux/SKILL.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-ux/SKILL.md\"}"
atom_ids:
  - choose-the-working-mode-for-the-design
  - close-the-information-architecture-with-every-need-and-surface
  - confirm-a-visual-reference-for-every-surface
  - finalize-the-design-in-a-fixed-order
  - give-the-experience-document-its-required-sections
  - give-the-visual-document-a-fixed-section-order
  - inherit-from-a-ui-system-and-specify-only-the-deltas
  - name-the-concerns-the-design-carries
atom_count: 8
atoms: "[{\"atom_id\":\"choose-the-working-mode-for-the-design\",\"file_sha256\":\"372b7ae2b422575d5a31e9e65ab982fa116e591b4644fc648154d21939db4fd5\",\"content_sha256\":\"9083b38de064d628b493c08a7efde4160bbd006ddb4d96b7777ed2091c5db17e\",\"file_bytes\":1742,\"body_bytes\":420},{\"atom_id\":\"close-the-information-architecture-with-every-need-and-surface\",\"file_sha256\":\"24f7ee751935a2c7f69b3be5f7a91abd472018e1cb241c3938db758a046c7aa8\",\"content_sha256\":\"b75b89e58581bd4f21c12137b82f1dc1dfc7f306cf155d1991de4a59bdd1f257\",\"file_bytes\":1891,\"body_bytes\":646},{\"atom_id\":\"confirm-a-visual-reference-for-every-surface\",\"file_sha256\":\"dda1f5fb5e81ef3594de521b70107818c69e8fc84a49857e815d8817e03db5f4\",\"content_sha256\":\"ed4e5f23de55e556bfbd9cf50c0be52f1f96227f35ef7f99cea9d13f7f0f9bca\",\"file_bytes\":1547,\"body_bytes\":315},{\"atom_id\":\"finalize-the-design-in-a-fixed-order\",\"file_sha256\":\"47063d446d585af615f8c6f7353128329f790d6449e24d1dfd51e94a7fed8262\",\"content_sha256\":\"a9e06bc3fe1311437048d20044fbc70b2a86762f593418c83b0618766fd72900\",\"file_bytes\":1569,\"body_bytes\":481},{\"atom_id\":\"give-the-experience-document-its-required-sections\",\"file_sha256\":\"040065a481825d7c04d7022a783836c684aa7e2a6789813f8bd78b627d26b286\",\"content_sha256\":\"8a3465c6e779012c0239e27329ff029fb2808b7bfa02e7f3acd828145afe84bc\",\"file_bytes\":1936,\"body_bytes\":680},{\"atom_id\":\"give-the-visual-document-a-fixed-section-order\",\"file_sha256\":\"138d4ca14d547e90cfbfdc19f2a5e1e0bf39060ac0201715459e99fbc8cd3862\",\"content_sha256\":\"a5769fd13e663085e3c86a7f449b18fe03238d386215e799f901b4a38d3fc790\",\"file_bytes\":2189,\"body_bytes\":901},{\"atom_id\":\"inherit-from-a-ui-system-and-specify-only-the-deltas\",\"file_sha256\":\"3d3ddf0d586fc25c1d08e3958bcadee402ae37bb8465c524832560f8e4cf6ea0\",\"content_sha256\":\"6748a90d5b5a9a656ea94ae3366aa6c5bbb6d550c1bc3f9965fb934c2881da93\",\"file_bytes\":1809,\"body_bytes\":535},{\"atom_id\":\"name-the-concerns-the-design-carries\",\"file_sha256\":\"42398e50a60e3b49253163f3d24552ff1178c98471015649fc357e7376692a5b\",\"content_sha256\":\"9f90dac0fe941b6dcf42d502b80b17728e3d464ae0485471105b18c838776588\",\"file_bytes\":1427,\"body_bytes\":256}]"
carrier_sha256: 9bf7a0fa558985a27d09824e9cf2377713a4a1ea6c78f4dad2a1541af3e73358
carrier_bytes: 15301
revision: 1
status: active
---
<!-- vpmodule:atom:begin choose-the-working-mode-for-the-design -->
---
instruction_id: choose-the-working-mode-for-the-design
title: Choose the working mode for the design
summary: "Three ways to run the design work: the fast path batches the gaps and drafts with assumption tags, the coaching path walks the decisions, and the design handoff hands the captured discovery to an external producer and continues afterwards."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - plan-execution
conditions_applies_when: The design work is about to run and the mode is not fixed.
conditions_does_not_apply_when: The person has already chosen the mode.
artifact_contract_output_type: working-mode-choice
artifact_contract_required_data:
  - the chosen mode
  - what that mode does with the open decisions
artifact_contract_verified_by: the mode is named and the assumptions or the handoff follow from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body lists three design modes and outputs but no selection criteria, sequence, judgment principle or unordered checks; form and domain cannot be assigned from the body alone."
---

# Choose the working mode for the design
Fast path — batch gaps, draft both spines with `[ASSUMPTION]` tags, skip creative tools.
Coaching path — walk decisions; creative tools woven in.
Design handoff — assemble captured Discovery into a producer-shaped prompt; user runs the external tool and saves outputs to the workspace in whatever format the tool emits.
EXPERIENCE.md can follow via Update mode when ready.
<!-- vpmodule:atom:end choose-the-working-mode-for-the-design -->
<!-- vpmodule:atom:begin close-the-information-architecture-with-every-need-and-surface -->
---
instruction_id: close-the-information-architecture-with-every-need-and-surface
title: Close the information architecture with every need and surface
summary: "The information architecture closes when every stated need has a surface that delivers it and every surface has a journey that lands there; the form factor must be resolved first, and a missing piece is probed, never invented."
capability_tags:
  - design-user-interface
pattern_tags:
  - requirements-clarification
conditions_applies_when: The information architecture is being closed.
conditions_does_not_apply_when: The surface map is not part of the work.
artifact_contract_output_type: surface-closure
artifact_contract_required_data:
  - the form factor
  - the need-to-surface map
  - the surface-to-journey map
artifact_contract_verified_by: "every need has a surface and every surface has a journey, and nothing was invented to close the gap"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Close the information architecture with every need and surface
Surface closure: stated needs become screens through journeys. IA closes when every need in the ticket's Requirements has a surface that delivers it, and every surface has a journey that lands there. With no ticket, the stated needs come from the confirmed sources.
When closure fails, probe — never invent the missing piece.
Form-factor: mobile / web / desktop / multi-surface must resolve before IA closes.
Named-protagonist journeys often derive it (Pary on iPad implies an iPad surface; Skeeter on Android adds a multi-surface need); when journeys don't disambiguate, probe.
<!-- vpmodule:atom:end close-the-information-architecture-with-every-need-and-surface -->
<!-- vpmodule:atom:begin confirm-a-visual-reference-for-every-surface -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/assets/key-screens.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Confirm a visual reference for every surface
Walk every IA surface; classify *mocked* vs *spine-only*.
Ask: *"These will be built from spine tables alone — any need a visual reference?"*
Render more if named; log spine-only choices.
Do not show every screen of every flow — 2-4 load-bearing surfaces, not 14.
<!-- vpmodule:atom:end confirm-a-visual-reference-for-every-surface -->
<!-- vpmodule:atom:begin finalize-the-design-in-a-fixed-order -->
---
instruction_id: finalize-the-design-in-a-fixed-order
title: Finalize the design in a fixed order
summary: "The finalisation has one order: distil the spines, reconcile the inputs, offer the review, triage the open items, render the key screens, confirm the mock coverage, extract and promote the artifacts, then close."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - plan-execution
conditions_applies_when: The discovery is done and the design is being finalised.
conditions_does_not_apply_when: The work is still in discovery.
artifact_contract_output_type: finalisation-record
artifact_contract_required_data:
  - the steps in order
  - the outcome of each step
artifact_contract_verified_by: the steps ran in the order and each one closed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Finalize the design in a fixed order
Outcomes, in order:
- Spines distilled. Surface gaps; never invent.
- Inputs reconciled. Surface dropped qualitative ideas.
- Reviewer Gate offered. Ask whether to run validation; if yes, present the lens menu. If any lens ran, resolve findings before polish; otherwise proceed.
- Open items triaged.
- Key-screen mocks rendered.
- Mock coverage confirmed.
- Layout extracted, artifacts promoted.
- Polished, handed off, closed. Share paths.
<!-- vpmodule:atom:end finalize-the-design-in-a-fixed-order -->
<!-- vpmodule:atom:begin give-the-experience-document-its-required-sections -->
---
instruction_id: give-the-experience-document-its-required-sections
title: Give the experience document its required sections
summary: "The experience document always carries foundation, information architecture, voice and tone, component patterns, state patterns, interaction primitives, the accessibility floor and key flows; inspiration and responsive appear when triggered, and product-specific sections are invented when needed."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - output-formatting
conditions_applies_when: The experience document is written.
conditions_does_not_apply_when: The document carries no behaviour.
artifact_contract_output_type: experience-document
artifact_contract_required_data:
  - the required sections
  - the triggered sections
  - the invented sections
artifact_contract_verified_by: the required sections are all present and every invented section answers a named concern
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Give the experience document its required sections
Always: **Foundation** (form-factor, UI system when present; DESIGN.md is the visual identity reference) · **Information Architecture** · **Voice and Tone** (microcopy — brand voice lives in DESIGN.md.Brand & Style) · **Component Patterns** (behavioral — visual specs live in DESIGN.md.Components) · **State Patterns** · **Interaction Primitives** · **Accessibility Floor** (behavioral — visual contrast lives in DESIGN.md) · **Key Flows** (named-protagonist journeys with a climax beat).
When triggered: **Inspiration & Anti-patterns** · **Responsive & Platform**.
Invent sections for product-specific concerns.
<!-- vpmodule:atom:end give-the-experience-document-its-required-sections -->
<!-- vpmodule:atom:begin give-the-visual-document-a-fixed-section-order -->
---
instruction_id: give-the-visual-document-a-fixed-section-order
title: Give the visual document a fixed section order
summary: "The visual document carries machine-readable tokens in the frontmatter and a body in a canonical order; sections may be omitted when they do not apply, the order is locked when they are present."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - output-formatting
conditions_applies_when: The visual identity document is written.
conditions_does_not_apply_when: The document carries no visual identity.
artifact_contract_output_type: visual-identity-document
artifact_contract_required_data:
  - the frontmatter tokens
  - the body sections in canonical order
artifact_contract_verified_by: the sections that are present are in the canonical order and the omitted ones do not apply
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Give the visual document a fixed section order
YAML frontmatter (machine-readable tokens) + markdown body (human-readable rationale, prose sections).
Brand & Style — Aesthetic posture in prose. The editorial voice — what *kind* of thing this is.
Colors — Per-color story. Why each exists, where it's used, what it's *not* used for.
Typography — Type roles, ramp, and rules. Platform conventions noted semantically when inherited.
Layout & Spacing — Spacing scale narrative, grid behavior, margins, gutters, breakpoint rules.
Elevation & Depth — Shadow language and tonal layering rules.
Shapes — Corner radii rules and the aesthetic logic behind them.
Components — Per-component visual specs: anatomy, color usage, sizing, state appearance.
Do's and Don'ts — Hard visual rules — what to do, what to avoid.
Sections may be omitted when not relevant; order is locked when present.
<!-- vpmodule:atom:end give-the-visual-document-a-fixed-section-order -->
<!-- vpmodule:atom:begin inherit-from-a-ui-system-and-specify-only-the-deltas -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/design-md-spec.md
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
<!-- vpmodule:atom:end inherit-from-a-ui-system-and-specify-only-the-deltas -->
<!-- vpmodule:atom:begin name-the-concerns-the-design-carries -->
---
instruction_id: name-the-concerns-the-design-carries
title: Name the concerns the design carries
summary: "Name what the design has to carry — accessibility, platforms, brand, regulated language, motion, i18n, dark mode, offline, content density, input modalities, notifications — and let that open list drive the sections you invent."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - requirements-clarification
conditions_applies_when: The scope of the design is being established.
conditions_does_not_apply_when: The concerns are already listed and settled.
artifact_contract_output_type: concern-scan
artifact_contract_required_data:
  - the open list of concerns
  - the sections each concern drives
artifact_contract_verified_by: "every concern named has a section, a rule or an explicit reason why it does not apply"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Name the concerns the design carries
Concern scan — name what the UX carries: accessibility, platforms, brand, regulated language, motion, i18n, dark mode, offline, content density, input modalities, notifications.
Open list; drives invented sections.
<!-- vpmodule:atom:end name-the-concerns-the-design-carries -->