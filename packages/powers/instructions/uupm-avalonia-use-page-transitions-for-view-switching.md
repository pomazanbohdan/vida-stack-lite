---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-avalonia-use-page-transitions-for-view-switching
title: "Use page transitions for view switching"
summary: "Built-in transitions for smooth navigation"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Navigation guidance for avalonia 12."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/avalonia.csv; sha256=442fca14675a020683473e7e49f08abb27b9df0765c80efe54aef61f1a4ac258; locator=stacks/avalonia.csv#L39"
status: active
revision: 1
---

# Use page transitions for view switching

Built-in transitions for smooth navigation

**Do:** CrossFade PageSlide or CompositePageTransition declared as a property element

**Don't:** Abrupt content swaps with no visual continuity

**Applies To:** avalonia 12

**Severity:** Low

**Good example:**

```text
<RoutedViewHost><RoutedViewHost.PageTransition><PageSlide Orientation="Horizontal" Duration="0:0:0.3"/></RoutedViewHost.PageTransition></RoutedViewHost>
```

**Bad example:**

```text
ContentControl with no transition between views
```
