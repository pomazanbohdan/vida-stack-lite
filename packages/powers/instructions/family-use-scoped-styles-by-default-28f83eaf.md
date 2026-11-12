---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-scoped-styles-by-default-28f83eaf"
title: "Use scoped styles by default"
summary: "Use scoped styles by default; each stack variant keeps its own guidance."
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
instruction_variants: "[{\"title\":\"Use scoped styles by default\",\"summary\":\"Astro scopes styles to component automatically\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for astro 7.1.6.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-astro-use-scoped-styles-by-default\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/astro.csv\",\"rowKey\":\"path=stacks/astro.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=61e90a0c14262ddfa4e4a7061fb571662817b2d53dca05a61bc325ba57e1e32c\",\"rawSha256\":\"2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"},\"sourceLabel\":\"astro 7.1.6\",\"applicability\":{\"frameworks\":[{\"name\":\"astro\",\"versionRange\":{\"raw\":\"7.1.6\",\"comparators\":[{\"op\":\"=\",\"version\":\"7.1.6\"}]},\"sourceLabel\":\"astro 7.1.6\"}],\"requiredContext\":[\"framework:astro\"]},\"contentSha256\":\"150cf127cd2a4e0ae82d13b6f23b18c14a59ffda08816920c13ca42c5cea99f0\"},{\"title\":\"Use scoped styles by default\",\"summary\":\"Styles scoped to component\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Styling guidance for svelte 5.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/svelte.csv; sha256=f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-svelte-use-scoped-styles-by-default\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/svelte.csv\",\"rowKey\":\"path=stacks/svelte.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=9e60eef0a9252700d5aa6469ae116a38d3a0d897ef4efa4f5f6be743c1b196f1\",\"rawSha256\":\"f6e379ba802941ba26b01d4ffbe3cd39120f2587659a1d93851c707f66bc13db\"},\"sourceLabel\":\"svelte 5\",\"applicability\":{\"frameworks\":[{\"name\":\"svelte\",\"sourceLabel\":\"svelte 5\"}],\"requiredContext\":[\"framework:svelte\"]},\"contentSha256\":\"0cbe7ad019ee922eba1065f6a3bc4e48b6a77d527106f12202f080d88cb5a143\"}]"
---
<!-- sbvf:variant:begin uupm-astro-use-scoped-styles-by-default -->
# Use scoped styles by default

Astro scopes styles to component automatically

**Do:** <style> for component-specific styles

**Don't:** Global styles for everything

**Applies To:** astro 7.1.6

**Severity:** Medium

**Good example:**

```text
<style> h1 { } </style> (scoped)
```

**Bad example:**

```text
<style is:global> for everything
```
<!-- sbvf:variant:end uupm-astro-use-scoped-styles-by-default -->
<!-- sbvf:variant:begin uupm-svelte-use-scoped-styles-by-default -->
# Use scoped styles by default

Styles scoped to component

**Do:** <style> for component styles

**Don't:** Global styles for component

**Applies To:** svelte 5

**Severity:** Medium

**Good example:**

```text
:global() only when needed
```

**Bad example:**

```text
<style> all global
```
<!-- sbvf:variant:end uupm-svelte-use-scoped-styles-by-default -->
