---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-loading-states-fe4b50d8"
title: "Loading states"
summary: "Show feedback during async operations; each stack variant keeps its own guidance."
capability_tags: 
  - "design-microinteraction"
  - "design-user-interface"
pattern_tags: 
  - "accessibility-compliance"
  - "design-system-adherence"
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
instruction_variants: "[{\"title\":\"Loading States\",\"summary\":\"Show feedback during async operations\",\"capability_tags\":[\"design-microinteraction\"],\"pattern_tags\":[\"microinteraction-feedback\"],\"conditions_applies_when\":\"Animation guidance for All interfaces.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=ux-guidelines.csv; sha256=ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-ux-loading-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"ux-guidelines.csv\",\"rowKey\":\"path=ux-guidelines.csv&headers=5e284965208985306fd14e0928f127330f15c6aa7067e95e951f3cecebbab3e5&cells=23ad2efe00d481ddcd46b6e93f93eca7f97951e9765ec569a717f2847bd47409\",\"rawSha256\":\"ff81ec613f70ba9fc3fcce52dbe4ae35d44b2079dbe6dc066d2d6e38c28facd5\"},\"sourceLabel\":\"All\",\"applicability\":{\"frameworks\":[{\"name\":\"all\",\"sourceLabel\":\"All\"}],\"requiredContext\":[\"framework:all\"]},\"contentSha256\":\"0acfc727d11d019dbe38bb1a849aeda38a06d7eae395b0ff92ec4649fa0c787b\"},{\"title\":\"Loading states\",\"summary\":\"Show loading feedback and prevent duplicate activation\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\",\"accessibility-compliance\"],\"conditions_applies_when\":\"Buttons guidance for html-tailwind 4.3.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-html-tailwind-loading-states\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/html-tailwind.csv\",\"rowKey\":\"path=stacks/html-tailwind.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=4fdb31acd4fe12ed9b2d69af790e32661770da3a9c1c2149d382090672c8bf34\",\"rawSha256\":\"d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee\"},\"sourceLabel\":\"html-tailwind 4.3\",\"applicability\":{\"frameworks\":[{\"name\":\"html-tailwind\",\"sourceLabel\":\"html-tailwind 4.3\"}],\"requiredContext\":[\"framework:html-tailwind\"]},\"contentSha256\":\"4570790abab690cda4ee2e0252569f468daf92d5b591afd97404dc31e90df522\"}]"
---
<!-- sbvf:variant:begin uupm-ux-loading-states -->
# Loading States

Show feedback during async operations

**Do:** Use skeleton screens or spinners

**Don't:** Leave UI frozen with no feedback

**Platform:** All

**Severity:** High

**Good example:**

```text
animate-pulse skeleton
```

**Bad example:**

```text
Blank screen while loading
```
<!-- sbvf:variant:end uupm-ux-loading-states -->
<!-- sbvf:variant:begin uupm-html-tailwind-loading-states -->
# Loading states

Show loading feedback and prevent duplicate activation

**Do:** Disable the action and expose busy state

**Don't:** Leave button clickable during loading

**Applies To:** html-tailwind 4.3

**Severity:** High

**Good example:**

```text
<button disabled aria-busy='true'>Saving</button>
```

**Bad example:**

```text
Button without loading state
```
<!-- sbvf:variant:end uupm-html-tailwind-loading-states -->
