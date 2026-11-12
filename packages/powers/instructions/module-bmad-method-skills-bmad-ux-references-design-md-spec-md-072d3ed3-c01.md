---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-ux-references-design-md-spec-md-072d3ed3-c01"
title: "bmad-method: skills/bmad-ux/references/design-md-spec.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-ux/references/design-md-spec.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-ux/references/design-md-spec.md\"}"
atom_ids:
  - declare-the-design-tokens-and-reference-them-by-name
  - reference-platform-conventions-instead-of-restating-values
atom_count: 2
atoms: "[{\"atom_id\":\"declare-the-design-tokens-and-reference-them-by-name\",\"file_sha256\":\"d39bffd296f1cc14499e206544136c90edfe05ff99fe5535eceba85a36bb20df\",\"content_sha256\":\"45d1f6255beaf6609c5e935136f6be82aa1410c50ff9b3632499ba90fec0d65a\",\"file_bytes\":2513,\"body_bytes\":1333},{\"atom_id\":\"reference-platform-conventions-instead-of-restating-values\",\"file_sha256\":\"2f6a6a804fcdcd89dac35d96670c5acf614f3cc97829834b59f77dc8f55b4f98\",\"content_sha256\":\"49d76970eed19386d6be5cf3486750a45b94bdd0df121fd3a471d5663a79e719\",\"file_bytes\":1427,\"body_bytes\":323}]"
carrier_sha256: 7401253d9a764e3bef3b587ff018f51ffd6a1dff64b1f3be73387ae920283025
carrier_bytes: 4275
revision: 1
status: active
---
<!-- vpmodule:atom:begin declare-the-design-tokens-and-reference-them-by-name -->
---
instruction_id: declare-the-design-tokens-and-reference-them-by-name
title: Declare the design tokens and reference them by name
summary: "The frontmatter holds the name, the description and the colour, typography, radius, spacing and component tokens with their types; the prose and the component objects reference those tokens by path, and the path follows the YAML structure."
capability_tags:
  - write-a-design-contract
pattern_tags:
  - output-formatting
conditions_applies_when: The visual identity document declares its tokens.
conditions_does_not_apply_when: The document has no tokens.
artifact_contract_output_type: token-declaration
artifact_contract_required_data:
  - the token keys and their types
  - the path references
artifact_contract_verified_by: every token reference resolves against the declared structure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Declare the design tokens and reference them by name
| Key | Type | Notes |
|---|---|---|
| `name` | string | Required. Brand or system name. |
| `description` | string | One-line statement of what this system is. |
| `colors` | flat object | Kebab-case keys. Values are hex strings (`'#FBF9F4'`). |
| `typography` | nested object | Each value: an object with any subset of `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`. |
| `rounded` | object | Scale names (`sm`, `md`, `lg`, `xl`, `full`, `DEFAULT`) → CSS dimensions. `full` is conventionally `9999px`. |
| `spacing` | object | Scale levels (`'1'`, `'2'`, ...) or named tokens (`gutter`, `margin-mobile`, `editorial-gap`) → dimensions. |
| `components` | object | Component-name → object of component tokens mapped to values or `{path.to.token}` references. |
`{path.to.token}` used in prose and inside component objects to reference frontmatter tokens.
The path follows the YAML structure.
The `components` frontmatter entry maps each named component (e.g. `button-primary`) to its specific token values.
Use `{path.to.token}` references freely
Light/dark mode. Either separate kebab-case tokens (`surface-base` / `surface-base-dark`) or separate DESIGN.md files per mode. The spec allows either; pick the form that reads cleanest for the product.
<!-- vpmodule:atom:end declare-the-design-tokens-and-reference-them-by-name -->
<!-- vpmodule:atom:begin reference-platform-conventions-instead-of-restating-values -->
---
instruction_id: reference-platform-conventions-instead-of-restating-values
title: Reference platform conventions instead of restating values
summary: "When a value belongs to a native platform, record a note that names the platform own role instead of a literal value; the platform owns the rendered value."
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: The design inherits a value from a native platform.
conditions_does_not_apply_when: The value is the product own.
artifact_contract_output_type: platform-note
artifact_contract_required_data:
  - the platform role
  - the note field
artifact_contract_verified_by: no platform value is written as a literal in the product own tokens
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-ux/references/design-md-spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
---

# Reference platform conventions instead of restating values
When inheriting from native platforms (iOS UIKit, Android Compose, Apple Human Interface Guidelines), use a `note` field instead of literal values: `{ note: 'iOS Title 1 · Android Headline Small' }`. The spec is the spec; the platform owns the rendered values.
<!-- vpmodule:atom:end reference-platform-conventions-instead-of-restating-values -->