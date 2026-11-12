---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-line-height-8829c7a7"
title: "Line height"
summary: "Keep line height readable; each stack variant keeps its own guidance."
capability_tags: 
  - "set-web-type"
pattern_tags: 
  - "type-context"
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
instruction_variants: "[{\"title\":\"Line Height\",\"summary\":\"Adequate line height improves readability\",\"capability_tags\":[\"set-web-type\"],\"pattern_tags\":[\"type-context\"],\"conditions_applies_when\":\"Typography guidance for All interfaces.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-ux-line-height\",\"source\":{\"donor\":\"uupm\",\"path\":\"ux-guidelines.csv\",\"rowKey\":\"path=ux-guidelines.csv&headers=5e284965208985306fd14e0928f127330f15c6aa7067e95e951f3cecebbab3e5&cells=80fe625f3accee1547dffadbf8f1f890b9805121c746924a46f7e4a8624a2d60\",\"rawSha256\":\"ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"},\"sourceLabel\":\"All\",\"applicability\":{\"frameworks\":[{\"name\":\"all\",\"sourceLabel\":\"All\"}],\"requiredContext\":[\"framework:all\"]},\"contentSha256\":\"c20bc5b9a982b53f9b64f47a68026a52d156f2d6e8e7ff5653392e9e5cab5255\"},{\"title\":\"Line height\",\"summary\":\"Use appropriate line height for readability\",\"capability_tags\":[\"set-web-type\"],\"pattern_tags\":[\"type-context\"],\"conditions_applies_when\":\"Typography guidance for html-tailwind 4.3.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-html-tailwind-line-height\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/html-tailwind.csv\",\"rowKey\":\"path=stacks/html-tailwind.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bc6704e09a62398580b763b2ac98411d9c38d5f91357c2e06512959d6a5fa524\",\"rawSha256\":\"d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"},\"sourceLabel\":\"html-tailwind 4.3\",\"applicability\":{\"frameworks\":[{\"name\":\"html-tailwind\",\"sourceLabel\":\"html-tailwind 4.3\"}],\"requiredContext\":[\"framework:html-tailwind\"]},\"contentSha256\":\"1de90f20bcd89241d1dc60e28fd8083d75f6afce5909cc3ea56a7b6d76fc7fd8\"}]"
---
<!-- sbvf:variant:begin uupm-ux-line-height -->
# Line Height

Adequate line height improves readability

**Do:** Use 1.5-1.75 for body text

**Don't:** Cramped or excessive line height

**Platform:** All

**Severity:** Medium

**Good example:**

```text
leading-relaxed (1.625)
```

**Bad example:**

```text
leading-none (1)
```
<!-- sbvf:variant:end uupm-ux-line-height -->
<!-- sbvf:variant:begin uupm-html-tailwind-line-height -->
# Line height

Use appropriate line height for readability

**Do:** leading-relaxed for body text

**Don't:** Default tight line height

**Applies To:** html-tailwind 4.3

**Severity:** Medium

**Good example:**

```text
leading-relaxed (1.625)
```

**Bad example:**

```text
leading-none or leading-tight
```
<!-- sbvf:variant:end uupm-html-tailwind-line-height -->
