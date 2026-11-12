---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-reduced-motion-3fee940d"
title: "Reduced motion"
summary: "Respect the user's motion preferences; each stack variant keeps its own guidance."
capability_tags: 
  - "audit-accessibility"
  - "design-microinteraction"
pattern_tags: 
  - "accessibility-compliance"
  - "microinteraction-feedback"
conditions_applies_when: "Applies when the selected framework variant matches."
conditions_does_not_apply_when: "The framework is not one of the declared variants or the variant exception applies."
artifact_contract_output_type: "none"
artifact_contract_required_data: []
artifact_contract_verified_by: "Each selected variant retains its source-specific contract and is checked against its source-bound guidance."
compatibility_excludes: []
compatibility_requires: []
roles: []
products: []
provenance: 
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Reduced Motion\",\"summary\":\"Respect user's motion preferences\",\"capability_tags\":[\"design-microinteraction\"],\"pattern_tags\":[\"microinteraction-feedback\"],\"conditions_applies_when\":\"Animation guidance for All interfaces.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-ux-reduced-motion\",\"source\":{\"donor\":\"uupm\",\"path\":\"ux-guidelines.csv\",\"rowKey\":\"path=ux-guidelines.csv&headers=5e284965208985306fd14e0928f127330f15c6aa7067e95e951f3cecebbab3e5&cells=46c6f6ce17f285bc16c2f778d1db7a7704a9c2e273a53cbe329b86808e5a7efd\",\"rawSha256\":\"ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"},\"sourceLabel\":\"All\",\"applicability\":{\"frameworks\":[{\"name\":\"all\",\"sourceLabel\":\"All\"}],\"requiredContext\":[\"framework:all\"]},\"contentSha256\":\"41dcae93c216dd3550da7093420d02331172adaaf5e3cc8e7bd7058c74b22824\"},{\"title\":\"Reduced motion\",\"summary\":\"Respect user motion preferences\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for html-tailwind 4.3.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-html-tailwind-reduced-motion\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/html-tailwind.csv\",\"rowKey\":\"path=stacks/html-tailwind.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=c2067369f096403c5060837f55b3e60e24e8241bbbf61a3c7406567843b61c9c\",\"rawSha256\":\"d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"},\"sourceLabel\":\"html-tailwind 4.3\",\"applicability\":{\"frameworks\":[{\"name\":\"html-tailwind\",\"sourceLabel\":\"html-tailwind 4.3\"}],\"requiredContext\":[\"framework:html-tailwind\"]},\"contentSha256\":\"763740289588dacf716212dfca33eb9d2ca659f84effc13c1e4acacd8d03426d\"}]"
---
<!-- sbvf:variant:begin uupm-ux-reduced-motion -->
# Reduced Motion

Respect user's motion preferences

**Do:** Check prefers-reduced-motion media query

**Don't:** Ignore accessibility motion settings

**Platform:** All

**Severity:** High

**Good example:**

```text
@media (prefers-reduced-motion: reduce)
```

**Bad example:**

```text
No motion query check
```
<!-- sbvf:variant:end uupm-ux-reduced-motion -->
<!-- sbvf:variant:begin uupm-html-tailwind-reduced-motion -->
# Reduced motion

Respect user motion preferences

**Do:** motion-reduce:animate-none

**Don't:** Ignore motion preferences

**Applies To:** html-tailwind 4.3

**Severity:** High

**Good example:**

```text
motion-reduce:transition-none
```

**Bad example:**

```text
No reduced motion support
```
<!-- sbvf:variant:end uupm-html-tailwind-reduced-motion -->
