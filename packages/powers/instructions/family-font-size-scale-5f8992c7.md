---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-font-size-scale-5f8992c7"
title: "Font size scale"
summary: "Keep a consistent type hierarchy; each stack variant keeps its own guidance."
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
instruction_variants: "[{\"title\":\"Font Size Scale\",\"summary\":\"Consistent type hierarchy aids scanning\",\"capability_tags\":[\"set-web-type\"],\"pattern_tags\":[\"type-context\"],\"conditions_applies_when\":\"Typography guidance for All interfaces.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-ux-font-size-scale\",\"source\":{\"donor\":\"uupm\",\"path\":\"ux-guidelines.csv\",\"rowKey\":\"path=ux-guidelines.csv&headers=5e284965208985306fd14e0928f127330f15c6aa7067e95e951f3cecebbab3e5&cells=2e76160567c7fe650e29b26bd3b7df5d8206c21dbf7e5a0dfc6f2e785047344a\",\"rawSha256\":\"ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"},\"sourceLabel\":\"All\",\"applicability\":{\"frameworks\":[{\"name\":\"all\",\"sourceLabel\":\"All\"}],\"requiredContext\":[\"framework:all\"]},\"contentSha256\":\"2bf97e17cba93f83b5fbc62d86aa57afa6346973dfa7231ef3f1485d5c4f5e94\"},{\"title\":\"Font size scale\",\"summary\":\"Use consistent text size scale\",\"capability_tags\":[\"set-web-type\"],\"pattern_tags\":[\"type-context\"],\"conditions_applies_when\":\"Typography guidance for html-tailwind 4.3.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-html-tailwind-font-size-scale\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/html-tailwind.csv\",\"rowKey\":\"path=stacks/html-tailwind.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=1daedea2459a32826f36aff84f1f69ea63603c733bc50a51fad3b3d773fc3b27\",\"rawSha256\":\"d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"},\"sourceLabel\":\"html-tailwind 4.3\",\"applicability\":{\"frameworks\":[{\"name\":\"html-tailwind\",\"sourceLabel\":\"html-tailwind 4.3\"}],\"requiredContext\":[\"framework:html-tailwind\"]},\"contentSha256\":\"ecab0e5d17f9d61fef200b0f9726233e0ea126483ab2658ae3810ce73ade6e11\"}]"
---
<!-- sbvf:variant:begin uupm-ux-font-size-scale -->
# Font Size Scale

Consistent type hierarchy aids scanning

**Do:** Use consistent modular scale

**Don't:** Random font sizes

**Platform:** All

**Severity:** Medium

**Good example:**

```text
Type scale (12 14 16 18 24 32)
```

**Bad example:**

```text
Arbitrary sizes
```
<!-- sbvf:variant:end uupm-ux-font-size-scale -->
<!-- sbvf:variant:begin uupm-html-tailwind-font-size-scale -->
# Font size scale

Use consistent text size scale

**Do:** text-sm text-base text-lg text-xl

**Don't:** Arbitrary font sizes

**Applies To:** html-tailwind 4.3

**Severity:** Low

**Good example:**

```text
text-lg
```

**Bad example:**

```text
text-[17px]
```
<!-- sbvf:variant:end uupm-html-tailwind-font-size-scale -->
