---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-swiftui-use-preview-macro-xcode-15
title: "Use #Preview macro (Xcode 15+)"
summary: "Modern preview syntax"
capability_tags:
  - design-user-interface
pattern_tags: []
conditions_applies_when: "Preview guidance for swiftui current; iOS 16+ baseline; Observation APIs iOS 17+."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/swiftui.csv; sha256=bdd9231ff3ad658f4e7c063e1eb49df2fd09ac8d90631a86df899b39833b9623; locator=stacks/swiftui.csv#L37"
status: active
revision: 1
---

# Use #Preview macro (Xcode 15+)

Modern preview syntax

**Do:** #Preview for view previews

**Don't:** PreviewProvider protocol

**Applies To:** swiftui current; iOS 16+ baseline; Observation APIs iOS 17+

**Severity:** Low

**Good example:**

```text
#Preview { ContentView() }
```

**Bad example:**

```text
struct ContentView_Previews: PreviewProvider
```
