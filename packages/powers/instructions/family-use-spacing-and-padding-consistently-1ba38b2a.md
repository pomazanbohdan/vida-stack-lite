---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-use-spacing-and-padding-consistently-1ba38b2a"
title: "Use spacing and padding consistently"
summary: "Use spacing and padding consistently; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Use spacing and padding consistently\",\"summary\":\"Desktop UI needs scan-friendly rhythm and clear grouping\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Layout guidance for javafx 26.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/javafx.csv; sha256=2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-javafx-use-spacing-and-padding-consistently\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/javafx.csv\",\"rowKey\":\"path=stacks/javafx.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=5459f497b6757e8cc6b179525f75841e2c1a07769a650c521ae3c437547a3aa4\",\"rawSha256\":\"2e819b8d5abdd23ad4dae0991650fdb57af497aabd68b37463aa9c442944c869\"},\"sourceLabel\":\"javafx 26\",\"applicability\":{\"frameworks\":[{\"name\":\"javafx\",\"sourceLabel\":\"javafx 26\"}],\"requiredContext\":[\"framework:javafx\"]},\"contentSha256\":\"2492ec61f7f9ad232a735f9ad770fac9a65ec30cec8aedb70ab767cb301aa628\"},{\"title\":\"Use spacing and padding consistently\",\"summary\":\"Consistent spacing throughout app\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Layout guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-use-spacing-and-padding-consistently\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=201eb62d4493282757c90791a11d55868882892f96648a771ec90ac1bf102879\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"da0d9d30b7e0a0a864e013b55d661b7ab13dafc732d9a312a6399c41cab645b6\"}]"
---
<!-- sbvf:variant:begin uupm-javafx-use-spacing-and-padding-consistently -->
# Use spacing and padding consistently

Desktop UI needs scan-friendly rhythm and clear grouping

**Do:** Set spacing padding and Insets through shared constants or CSS

**Don't:** Use inconsistent ad hoc gaps between controls

**Applies To:** javafx 26

**Severity:** Low

**Good example:**

```text
form.setHgap(12); form.setVgap(10); form.setPadding(new Insets(16));
```

**Bad example:**

```text
box.setSpacing(3); other.setSpacing(17);
```
<!-- sbvf:variant:end uupm-javafx-use-spacing-and-padding-consistently -->
<!-- sbvf:variant:begin uupm-swiftui-use-spacing-and-padding-consistently -->
# Use spacing and padding consistently

Consistent spacing throughout app

**Do:** Design system spacing values

**Don't:** Magic numbers for spacing

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Low

**Good example:**

```text
.padding(16) or .padding()
```

**Bad example:**

```text
.padding(13), .padding(17)
```
<!-- sbvf:variant:end uupm-swiftui-use-spacing-and-padding-consistently -->
