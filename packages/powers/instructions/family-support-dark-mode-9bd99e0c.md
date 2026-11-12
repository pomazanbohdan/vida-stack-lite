---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-support-dark-mode-9bd99e0c"
title: "Support dark mode"
summary: "Support dark mode; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Support dark mode\",\"summary\":\"Respect system theme\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Theming guidance for flutter 3.44.x (current stable line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-flutter-support-dark-mode\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/flutter.csv\",\"rowKey\":\"path=stacks/flutter.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=b3c3f119fea7f7f27fd32e730385b18191bbf311a9d30f6f283162e7723a372c\",\"rawSha256\":\"64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"},\"sourceLabel\":\"flutter 3.44.x (current stable line)\",\"applicability\":{\"frameworks\":[{\"name\":\"flutter\",\"versionRange\":{\"raw\":\"3.44.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"3.44.0\"},{\"op\":\"<\",\"version\":\"3.45.0\"}]},\"sourceLabel\":\"flutter 3.44.x (current stable line)\"}],\"requiredContext\":[\"framework:flutter\"]},\"contentSha256\":\"2a5f8178463ab3c5e10f53a864ff162c939b2a6b8728b2d6a9a59f4542c4ddd8\"},{\"title\":\"Support dark mode\",\"summary\":\"Override semantic OKLCH variables under .dark for every custom theme token\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Theming guidance for shadcn cli 4; base=base|radix|aria.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-shadcn-support-dark-mode\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/shadcn.csv\",\"rowKey\":\"path=stacks/shadcn.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=7d7fbc8d26fd7f3cd1dfb2c1ba06c6caf9c4f536326bab3b5a247406b1b69a77\",\"rawSha256\":\"e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51\"},\"sourceLabel\":\"shadcn cli 4; base=base|radix|aria\",\"applicability\":{\"frameworks\":[{\"name\":\"shadcn\",\"sourceLabel\":\"shadcn cli 4; base=base|radix|aria\"}],\"requiredContext\":[\"framework:shadcn\"]},\"contentSha256\":\"09df393949bb444090ebe6f0de37e09bc9b4b26f1e59c4c86bbe80caf0331bda\"}]"
---
<!-- sbvf:variant:begin uupm-flutter-support-dark-mode -->
# Support dark mode

Respect system theme

**Do:** darkTheme in MaterialApp

**Don't:** Light theme only

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** Medium

**Good example:**

```text
MaterialApp(theme: light, darkTheme: dark)
```

**Bad example:**

```text
MaterialApp(theme: light)
```
<!-- sbvf:variant:end uupm-flutter-support-dark-mode -->
<!-- sbvf:variant:begin uupm-shadcn-support-dark-mode -->
# Support dark mode

Override semantic OKLCH variables under .dark for every custom theme token

**Do:** Define complete :root and .dark semantic schemes

**Don't:** Keep legacy space-separated HSL snippets or omit dark tokens

**Applies To:** shadcn cli 4; base=base|radix|aria

**Severity:** High

**Good example:**

```text
.dark { --background: oklch(0.145 0 0); }
```

**Bad example:**

```text
.dark { --background: 240 10% 3.9%; }
```
<!-- sbvf:variant:end uupm-shadcn-support-dark-mode -->
