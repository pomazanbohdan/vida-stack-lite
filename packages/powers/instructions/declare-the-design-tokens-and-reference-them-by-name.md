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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ux/references/design-md-spec.md
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
