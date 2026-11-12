---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-disabled-states-de30c3d9"
title: "Disabled states"
summary: "Clearly indicate non-interactive elements; each stack variant keeps its own guidance."
capability_tags: 
  - "design-user-interface"
pattern_tags: 
  - "state-modeling"
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
instruction_variants: "[{\"title\":\"Disabled States\",\"summary\":\"Clearly indicate non-interactive elements\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Interaction guidance for All interfaces.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-ux-disabled-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"ux-guidelines.csv\",\"rowKey\":\"path=ux-guidelines.csv&headers=5e284965208985306fd14e0928f127330f15c6aa7067e95e951f3cecebbab3e5&cells=69d4284ed8e5b7e2abb6e23bdbac90f5e2131cb0664b3d537977ec8cfe3d4d9f\",\"rawSha256\":\"ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"},\"sourceLabel\":\"All\",\"applicability\":{\"frameworks\":[{\"name\":\"all\",\"sourceLabel\":\"All\"}],\"requiredContext\":[\"framework:all\"]},\"contentSha256\":\"eca64ead82e93452c3b4a914d876663591d2636fdd860847e0ff5556e61fbcfc\"},{\"title\":\"Disabled states\",\"summary\":\"Clear disabled styling\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"state-modeling\"],\"conditions_applies_when\":\"Forms guidance for html-tailwind 4.3.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-html-tailwind-disabled-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/html-tailwind.csv\",\"rowKey\":\"path=stacks/html-tailwind.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=bf8ffa3e8c2304e88d119fd128717a59991509044f0b5b9cc9ee9331649bcb97\",\"rawSha256\":\"d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"},\"sourceLabel\":\"html-tailwind 4.3\",\"applicability\":{\"frameworks\":[{\"name\":\"html-tailwind\",\"sourceLabel\":\"html-tailwind 4.3\"}],\"requiredContext\":[\"framework:html-tailwind\"]},\"contentSha256\":\"790df202b4772f9c4eb8d0ad56c635d6393b19d2d3938a6bcb0a8da735c18b8f\"}]"
---
<!-- sbvf:variant:begin uupm-ux-disabled-states -->
# Disabled States

Clearly indicate non-interactive elements

**Do:** Reduce opacity and change cursor

**Don't:** Confuse disabled with normal state

**Platform:** All

**Severity:** Medium

**Good example:**

```text
opacity-50 cursor-not-allowed
```

**Bad example:**

```text
Same style as enabled
```
<!-- sbvf:variant:end uupm-ux-disabled-states -->
<!-- sbvf:variant:begin uupm-html-tailwind-disabled-states -->
# Disabled states

Clear disabled styling

**Do:** disabled:opacity-50 disabled:cursor-not-allowed

**Don't:** No disabled indication

**Applies To:** html-tailwind 4.3

**Severity:** Medium

**Good example:**

```text
disabled:opacity-50
```

**Bad example:**

```text
Same style as enabled
```
<!-- sbvf:variant:end uupm-html-tailwind-disabled-states -->
