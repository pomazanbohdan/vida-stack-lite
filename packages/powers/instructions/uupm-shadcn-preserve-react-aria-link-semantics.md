---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-shadcn-preserve-react-aria-link-semantics
title: "Preserve React Aria link semantics"
summary: "Style a semantic anchor with buttonVariants when navigation is intended"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Patterns guidance for shadcn cli 4; base=aria."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/shadcn.csv; sha256=e56cfde5b74907836ac3582a4779d5b7f3d206a702ab81b8669a1b668c3eeb51; locator=stacks/shadcn.csv#L68"
status: active
revision: 1
---

# Preserve React Aria link semantics

Style a semantic anchor with buttonVariants when navigation is intended

**Do:** Use an anchor for a link and a button for an action

**Don't:** Render a React Aria Button that masquerades as a link

**Applies To:** shadcn cli 4; base=aria

**Severity:** High

**Good example:**

```text
<a href="/docs" className={buttonVariants()}>Docs</a>
```

**Bad example:**

```text
<Button onPress={() => navigate('/docs')}>Docs</Button>
```
