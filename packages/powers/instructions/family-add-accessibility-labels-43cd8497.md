---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-add-accessibility-labels-43cd8497"
title: "Add accessibility labels"
summary: "Add accessibility labels to interactive elements; each stack variant keeps its own guidance."
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5"
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Add accessibility labels\",\"summary\":\"Describe UI elements\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for react-native 0.86.x (official active line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react-native.csv; sha256=ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-react-native-add-accessibility-labels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/react-native.csv\",\"rowKey\":\"path=stacks/react-native.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=aeabc769021347217242d555cc3e40159508f713c504a0fb3e55a9bacd299da5\",\"rawSha256\":\"ba31dd9c0c04da6bc02a74448bf121f9c0728ae5ba3b4d47b487778b0a1135b5\"},\"sourceLabel\":\"react-native 0.86.x (official active line)\",\"applicability\":{\"frameworks\":[{\"name\":\"react-native\",\"versionRange\":{\"raw\":\"0.86.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"0.86.0\"},{\"op\":\"<\",\"version\":\"0.87.0\"}]},\"sourceLabel\":\"react-native 0.86.x (official active line)\"}],\"requiredContext\":[\"framework:react-native\"]},\"contentSha256\":\"d212348c3f51bd4e10a88387307f3c90c4e71f4d28d3cb6f008083ebbeb72852\"},{\"title\":\"Add accessibility labels\",\"summary\":\"Describe UI elements\",\"capability_tags\":[\"audit-accessibility\"],\"pattern_tags\":[\"accessibility-compliance\"],\"conditions_applies_when\":\"Accessibility guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-add-accessibility-labels\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=aa69c468dbd0972c83e3e3d85853424ca8db5e655b3981c53a46e65279adb76b\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"fc43b40548ef0c89d0296161c8dba57dff01348c0faaced3dda903f2fb42fddb\"}]"
---
<!-- sbvf:variant:begin uupm-react-native-add-accessibility-labels -->
# Add accessibility labels

Describe UI elements

**Do:** accessibilityLabel for all interactive

**Don't:** Missing labels

**Applies To:** react-native 0.86.x (official active line)

**Severity:** High

**Good example:**

```text
accessibilityLabel="Submit form"
```

**Bad example:**

```text
<Pressable> without label
```
<!-- sbvf:variant:end uupm-react-native-add-accessibility-labels -->
<!-- sbvf:variant:begin uupm-swiftui-add-accessibility-labels -->
# Add accessibility labels

Describe UI elements

**Do:** .accessibilityLabel for context

**Don't:** Missing labels

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** High

**Good example:**

```text
.accessibilityLabel("Close button")
```

**Bad example:**

```text
Button without label
```
<!-- sbvf:variant:end uupm-swiftui-add-accessibility-labels -->
