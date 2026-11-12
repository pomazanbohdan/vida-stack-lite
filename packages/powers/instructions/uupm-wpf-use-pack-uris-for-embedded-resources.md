---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-use-pack-uris-for-embedded-resources
title: "Use pack URIs for embedded resources"
summary: "Reference embedded images fonts and resource dictionaries via the pack scheme"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Styling guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L20"
status: active
revision: 1
---

# Use pack URIs for embedded resources

Reference embedded images fonts and resource dictionaries via the pack scheme

**Do:** pack://application:,,, syntax for cross-assembly assets

**Don't:** File-system paths for resources compiled into the assembly

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
<Image Source="pack://application:,,,/MyApp;component/Resources/icon.png"/>
```

**Bad example:**

```text
<Image Source="C:\Resources\icon.png"/>
```
