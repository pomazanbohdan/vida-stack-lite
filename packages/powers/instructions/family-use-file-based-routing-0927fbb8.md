---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-file-based-routing-0927fbb8"
title: "Use file-based routing"
summary: "Use file-based routing; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "interaction-simplification"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use file-based routing\",\"summary\":\"Create routes by adding .astro files in pages/\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Routing guidance for astro 7.1.6.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/astro.csv; sha256=2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-astro-use-file-based-routing\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/astro.csv\",\"rowKey\":\"path=stacks/astro.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=af2c5a9daac866b4d86c98b4cd611af9f192e9f69d603e88cfd403c2c3667625\",\"rawSha256\":\"2c2f55fadaafc05e04cc321c8194a1a28b656e6757fe2ba316f41b16428299c6\"},\"sourceLabel\":\"astro 7.1.6\",\"applicability\":{\"frameworks\":[{\"name\":\"astro\",\"versionRange\":{\"raw\":\"7.1.6\",\"comparators\":[{\"op\":\"=\",\"version\":\"7.1.6\"}]},\"sourceLabel\":\"astro 7.1.6\"}],\"requiredContext\":[\"framework:astro\"]},\"contentSha256\":\"f0f76b387e9ff64bf6fd928df700a2e2b7e02fee662b846b0daa594778b01dda\"},{\"title\":\"Use file-based routing\",\"summary\":\"Create routes by adding files in app directory\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Routing guidance for nextjs 16.2.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nextjs-use-file-based-routing\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nextjs.csv\",\"rowKey\":\"path=stacks/nextjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=9ffcddb3df3c498263097b32d925ab1f8c2e1f187f4f2e48b7bf9dd5c324b9a6\",\"rawSha256\":\"ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4\"},\"sourceLabel\":\"nextjs 16.2\",\"applicability\":{\"frameworks\":[{\"name\":\"nextjs\",\"sourceLabel\":\"nextjs 16.2\"}],\"requiredContext\":[\"framework:nextjs\"]},\"contentSha256\":\"9a73f39f90410d1835a355e7949e0b3127a2a1c88614436793d08d1daf07d00d\"},{\"title\":\"Use file-based routing\",\"summary\":\"Create routes under the Nuxt 4 app pages directory\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"interaction-simplification\"],\"conditions_applies_when\":\"Routing guidance for nuxtjs 4.5.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-nuxtjs-use-file-based-routing\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/nuxtjs.csv\",\"rowKey\":\"path=stacks/nuxtjs.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=361df3895303494557debd5e229f20b4e132db6539ffc41f023be4b881c52472\",\"rawSha256\":\"3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176\"},\"sourceLabel\":\"nuxtjs 4.5\",\"applicability\":{\"frameworks\":[{\"name\":\"nuxtjs\",\"sourceLabel\":\"nuxtjs 4.5\"}],\"requiredContext\":[\"framework:nuxtjs\"]},\"contentSha256\":\"c38969918ccfbac38330268a51fb304e46165fa4ffd8c490995d65ee9dfd3117\"}]"
---
<!-- sbvf:variant:begin uupm-astro-use-file-based-routing -->
# Use file-based routing

Create routes by adding .astro files in pages/

**Do:** pages/ directory for routes

**Don't:** Manual route configuration

**Applies To:** astro 7.1.6

**Severity:** Medium

**Good example:**

```text
src/pages/about.astro
```

**Bad example:**

```text
Custom router setup
```
<!-- sbvf:variant:end uupm-astro-use-file-based-routing -->
<!-- sbvf:variant:begin uupm-nextjs-use-file-based-routing -->
# Use file-based routing

Create routes by adding files in app directory

**Do:** page.tsx for routes layout.tsx for layouts

**Don't:** Manual route configuration

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
app/blog/[slug]/page.tsx
```

**Bad example:**

```text
Custom router setup
```
<!-- sbvf:variant:end uupm-nextjs-use-file-based-routing -->
<!-- sbvf:variant:begin uupm-nuxtjs-use-file-based-routing -->
# Use file-based routing

Create routes under the Nuxt 4 app pages directory

**Do:** app/pages with index.vue

**Don't:** Configure ordinary routes manually

**Applies To:** nuxtjs 4.5

**Severity:** Medium

**Good example:**

```text
app/pages/dashboard/index.vue
```

**Bad example:**

```text
Custom router setup
```
<!-- sbvf:variant:end uupm-nuxtjs-use-file-based-routing -->
