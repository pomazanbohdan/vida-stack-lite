---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-css-variables-for-theming-f918fed6"
title: "Use CSS variables for theming"
summary: "Use CSS variables for theming; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "design-system-adherence"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use CSS variables for theming\",\"summary\":\"Define tokens in :root\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for astro 7.1.6.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-astro-use-css-variables-for-theming\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/astro.csv\",\"rowKey\":\"path=stacks/astro.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=e994a191d0e39686adb2314236dffb4e9e7879d69c748310f19ecd4b753d83c8\",\"rawSha256\":\"2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"},\"sourceLabel\":\"astro 7.1.6\",\"applicability\":{\"frameworks\":[{\"name\":\"astro\",\"versionRange\":{\"raw\":\"7.1.6\",\"comparators\":[{\"op\":\"=\",\"version\":\"7.1.6\"}]},\"sourceLabel\":\"astro 7.1.6\"}],\"requiredContext\":[\"framework:astro\"]},\"contentSha256\":\"c4605a41fe6e3092e6cd413971fd98635d321b4bb38b422249a93ee22b809925\"},{\"title\":\"Use CSS variables for theming\",\"summary\":\"Dynamic styling\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for svelte 5.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-svelte-use-css-variables-for-theming\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/svelte.csv\",\"rowKey\":\"path=stacks/svelte.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bb7a06cc373a61c27cef6c8ac10579728d5469174ab72b2bb4da8df7938c881a\",\"rawSha256\":\"f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db\"},\"sourceLabel\":\"svelte 5\",\"applicability\":{\"frameworks\":[{\"name\":\"svelte\",\"sourceLabel\":\"svelte 5\"}],\"requiredContext\":[\"framework:svelte\"]},\"contentSha256\":\"dc8f088d10d9042acb4bea4d3639be72e69f6db5b7600e138f975b56b85f4976\"}]"
---
<!-- sbvf:variant:begin uupm-astro-use-css-variables-for-theming -->
# Use CSS variables for theming

Define tokens in :root

**Do:** CSS custom properties for themes

**Don't:** Hardcoded colors everywhere

**Applies To:** astro 7.1.6

**Severity:** Medium

**Good example:**

```text
:root { --primary: #3b82f6; }
```

**Bad example:**

```text
color: #3b82f6; everywhere
```
<!-- sbvf:variant:end uupm-astro-use-css-variables-for-theming -->
<!-- sbvf:variant:begin uupm-svelte-use-css-variables-for-theming -->
# Use CSS variables for theming

Dynamic styling

**Do:** CSS custom properties

**Don't:** Inline styles for themes

**Applies To:** svelte 5

**Severity:** Low

**Good example:**

```text
style="--color: {color}"
```

**Bad example:**

```text
style="color: {color}"
```
<!-- sbvf:variant:end uupm-svelte-use-css-variables-for-theming -->
