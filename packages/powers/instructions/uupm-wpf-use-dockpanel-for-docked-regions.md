---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-dockpanel-for-docked-regions
title: "Use DockPanel for docked regions"
summary: "Dock children to edges with last child filling"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Layout guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L16"
status: active
revision: 1
---

# Use DockPanel for docked regions

Dock children to edges with last child filling

**Do:** DockPanel for shell layouts (menu top sidebar left)

**Don't:** Nested StackPanels to simulate docking

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
<DockPanel><Menu DockPanel.Dock="Top"/><TreeView DockPanel.Dock="Left"/><Frame/></DockPanel>
```

**Bad example:**

```text
Nested StackPanels with fixed widths for shell
```
