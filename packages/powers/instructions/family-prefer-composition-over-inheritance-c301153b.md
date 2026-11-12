---
schema: "VPInstruction/v3"
classification_status: "unclassified"
classification_reason: "sbvf-family-pilot"
instruction_id: "family-prefer-composition-over-inheritance-c301153b"
title: "Prefer composition over inheritance"
summary: "Prefer composition over inheritance; each stack variant keeps its own guidance."
capability_tags: 
  - "design-ios-interface"
  - "design-user-interface"
pattern_tags: 
  - "design-system-adherence"
  - "ios-platform-idiom"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623"
status: "active"
revision: 1
instruction_variants: "[{\"title\":\"Prefer composition over inheritance\",\"summary\":\"Combine widgets using children\",\"capability_tags\":[\"design-user-interface\"],\"pattern_tags\":[\"design-system-adherence\"],\"conditions_applies_when\":\"Widgets guidance for flutter 3.44.x (current stable line).\",\"conditions_does_not_apply_when\":\"A context where the framework version or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/flutter.csv; sha256=64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-flutter-prefer-composition-over-inheritance\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/flutter.csv\",\"rowKey\":\"path=stacks/flutter.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=96bee8a0c9f11b2696dc4567a83bd65037d3ef9a27861e9088bfc8cf668fd719\",\"rawSha256\":\"64dba0ac17349f28bce517a0f5f48c54d9ed2e487ec0c0258303463b382f41a0\"},\"sourceLabel\":\"flutter 3.44.x (current stable line)\",\"applicability\":{\"frameworks\":[{\"name\":\"flutter\",\"versionRange\":{\"raw\":\"3.44.x\",\"comparators\":[{\"op\":\">=\",\"version\":\"3.44.0\"},{\"op\":\"<\",\"version\":\"3.45.0\"}]},\"sourceLabel\":\"flutter 3.44.x (current stable line)\"}],\"requiredContext\":[\"framework:flutter\"]},\"contentSha256\":\"f3eb41b749d995f8746931093f7cc8996b45f0fc6e9d1de12e2f43cc506dd5c4\"},{\"title\":\"Prefer composition over inheritance\",\"summary\":\"Compose views using ViewBuilder\",\"capability_tags\":[\"design-ios-interface\"],\"pattern_tags\":[\"ios-platform-idiom\"],\"conditions_applies_when\":\"Views guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+.\",\"conditions_does_not_apply_when\":\"A context where the platform convention or the stated exception makes the rule unsafe.\",\"artifact_contract_output_type\":\"none\",\"artifact_contract_required_data\":[],\"artifact_contract_verified_by\":\"The interface applies the stated rule and the result is checked against the source guideline.\",\"compatibility_excludes\":[],\"compatibility_requires\":[],\"provenance\":[\"donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"],\"status\":\"active\",\"revision\":1,\"classification_status\":\"unclassified\",\"classification_reason\":\"h2-csv-pilot-not-classified\",\"variant_id\":\"uupm-swiftui-prefer-composition-over-inheritance\",\"source\":{\"donor\":\"uupm\",\"path\":\"stacks/swiftui.csv\",\"rowKey\":\"path=stacks/swiftui.csv&headers=38c3842d4917f59c0e01aac56b2d645e7d8c6eb46d93d809d53d841a23539b38&cells=23140fbce3e91122334e65616363fa268f6d35f5b659f410774dd74d841ae92f\",\"rawSha256\":\"bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623\"},\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\",\"applicability\":{\"frameworks\":[{\"name\":\"swiftui\",\"sourceLabel\":\"swiftui current; iOS 16+ baseline; Observation APIs iOS 17+\"}],\"requiredContext\":[\"framework:swiftui\"]},\"contentSha256\":\"393ebc8a74808ed9f4968cfe6bed3c6df1c43ecf418bbdbe8bf8652dab9146a3\"}]"
---
<!-- sbvf:variant:begin uupm-flutter-prefer-composition-over-inheritance -->
# Prefer composition over inheritance

Combine widgets using children

**Do:** Compose widgets

**Don't:** Extend widget classes

**Applies To:** flutter 3.44.x (current stable line)

**Severity:** Medium

**Good example:**

```text
Container(child: MyContent())
```

**Bad example:**

```text
class MyContainer extends Container
```
<!-- sbvf:variant:end uupm-flutter-prefer-composition-over-inheritance -->
<!-- sbvf:variant:begin uupm-swiftui-prefer-composition-over-inheritance -->
# Prefer composition over inheritance

Compose views using ViewBuilder

**Do:** Combine smaller views

**Don't:** Inheritance hierarchies

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Medium

**Good example:**

```text
VStack { Header() Content() }
```

**Bad example:**

```text
class SpecialView extends BaseView
```
<!-- sbvf:variant:end uupm-swiftui-prefer-composition-over-inheritance -->
