---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-wpf-keep-code-behind-minimal
title: "Keep code-behind minimal"
summary: "Code-behind should only contain view-specific logic"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Architecture guidance for wpf current."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/wpf.csv; sha256=9781a9950b20333637b30a02e498b7efca21b618a3eeb8665836f3ac6e974da7; locator=stacks/wpf.csv#L53"
status: active
revision: 1
---

# Keep code-behind minimal

Code-behind should only contain view-specific logic

**Do:** View logic like focus management and animations in code-behind

**Don't:** Business logic and data access in code-behind

**Applies To:** wpf current

**Severity:** Medium

**Good example:**

```text
Loaded handler that sets initial focus
```

**Bad example:**

```text
Loaded handler that calls database and populates grid
```
