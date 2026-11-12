---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-support-keyboard-navigation-b8dc783f"
title: "Support keyboard navigation"
summary: "Support keyboard navigation; each stack variant keeps its own guidance."
capability_tags: 
  - "audit-accessibility"
pattern_tags: 
  - "accessibility-compliance"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Support keyboard navigation\",\"summary\":\"Full keyboard operability\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for avalonia 12.\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-avalonia-support-keyboard-navigation\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/avalonia.csv\",\"rowKey\":\"path=stacks/avalonia.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=fc8b0c41f1b7b33d861610edf853b4ed4495d9706dc3fd17561c1010a95e7628\",\"rawSha256\":\"442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258\"},\"sourceLabel\":\"avalonia 12\",\"applicability\":{\"frameworks\":[{\"name\":\"avalonia\",\"sourceLabel\":\"avalonia 12\"}],\"requiredContext\":[\"framework:avalonia\"]},\"contentSha256\":\"bede4ac0c9a9d2854c5ac5c2d84781b5449040d0798dcd2cf71842aed271daa3\"},{\"title\":\"Support keyboard navigation\",\"summary\":\"All functionality reachable via keyboard\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for wpf current.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-wpf-support-keyboard-navigation\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/wpf.csv\",\"rowKey\":\"path=stacks/wpf.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=93d923860e0df17f9bcbca60d0d4de08a6c9c3a3c2647ee843f721d37794aacd\",\"rawSha256\":\"9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7\"},\"sourceLabel\":\"wpf current\",\"applicability\":{\"frameworks\":[{\"name\":\"wpf\",\"sourceLabel\":\"wpf current\"}],\"requiredContext\":[\"framework:wpf\"]},\"contentSha256\":\"b08013e924f0c086f629d43b462f4ab6860e232c1e8589e1dd46983d9ca63079\"}]"
---
<!-- sbvf:variant:begin uupm-avalonia-support-keyboard-navigation -->
# Support keyboard navigation

Full keyboard operability

**Do:** TabIndex and KeyboardNavigation properties

**Don't:** Mouse-only interactions

**Applies To:** avalonia 12

**Severity:** High

**Good example:**

```text
<Button TabIndex="1" Content="Save"/>
```

**Bad example:**

```text
Clickable controls without keyboard support
```
<!-- sbvf:variant:end uupm-avalonia-support-keyboard-navigation -->
<!-- sbvf:variant:begin uupm-wpf-support-keyboard-navigation -->
# Support keyboard navigation

All functionality reachable via keyboard

**Do:** Tab order and KeyboardNavigation properties

**Don't:** Mouse-only interactions

**Applies To:** wpf current

**Severity:** High

**Good example:**

```text
<StackPanel KeyboardNavigation.TabNavigation="Cycle">
```

**Bad example:**

```text
Click handlers with no keyboard equivalent
```
<!-- sbvf:variant:end uupm-wpf-support-keyboard-navigation -->
