---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-analyze-bundle-size-1bee1185"
title: "Analyze bundle size"
summary: "Analyze bundle size to catch regressions; each stack variant keeps its own guidance."
capability_tags: 
  - "improve-performance"
pattern_tags: 
  - "performance-measurement"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Analyze bundle size\",\"summary\":\"Monitor JS bundle impact\",\"capability_tags\":[\"improve-performance\"],\"pattern_tags\":[\"performance-measurement\"],\"conditions_applies_when\":\"Build guidance for astro 7.1.6.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-astro-analyze-bundle-size\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/astro.csv\",\"rowKey\":\"path=stacks/astro.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=94793887df28b484d2fb305952028fb6357e3cc27e0be78c527ebdbdc2249acf\",\"rawSha256\":\"2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"},\"sourceLabel\":\"astro 7.1.6\",\"applicability\":{\"frameworks\":[{\"name\":\"astro\",\"versionRange\":{\"raw\":\"7.1.6\",\"comparators\":[{\"op\":\"=\",\"version\":\"7.1.6\"}]},\"sourceLabel\":\"astro 7.1.6\"}],\"requiredContext\":[\"framework:astro\"]},\"contentSha256\":\"58b80a6301c8ae3acb113cd38c2fa96f4e3378b999000628fd4387c32066e165\"},{\"title\":\"Analyze bundle size\",\"summary\":\"Use @next/bundle-analyzer\",\"capability_tags\":[\"improve-performance\"],\"pattern_tags\":[\"performance-measurement\"],\"conditions_applies_when\":\"Performance guidance for nextjs 16.2.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nextjs-analyze-bundle-size\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nextjs.csv\",\"rowKey\":\"path=stacks/nextjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4b7000b806f704fd0da6f2a34705cd858c6385bdbdb8fd35ede04019244e3cc7\",\"rawSha256\":\"ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"},\"sourceLabel\":\"nextjs 16.2\",\"applicability\":{\"frameworks\":[{\"name\":\"nextjs\",\"sourceLabel\":\"nextjs 16.2\"}],\"requiredContext\":[\"framework:nextjs\"]},\"contentSha256\":\"031d3bfd27fbbaf5b82b8bb2681483457dde7b04a10244e9d474f5ac765390b6\"}]"
---
<!-- sbvf:variant:begin uupm-astro-analyze-bundle-size -->
# Analyze bundle size

Monitor JS bundle impact

**Do:** Build output shows bundle sizes

**Don't:** Ignore bundle growth

**Applies To:** astro 7.1.6

**Severity:** Medium

**Good example:**

```text
Check astro build output
```

**Bad example:**

```text
No size monitoring
```
<!-- sbvf:variant:end uupm-astro-analyze-bundle-size -->
<!-- sbvf:variant:begin uupm-nextjs-analyze-bundle-size -->
# Analyze bundle size

Use @next/bundle-analyzer

**Do:** Bundle analyzer in dev

**Don't:** Ship large bundles blindly

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
ANALYZE=true npm run build
```

**Bad example:**

```text
No bundle analysis
```
<!-- sbvf:variant:end uupm-nextjs-analyze-bundle-size -->
