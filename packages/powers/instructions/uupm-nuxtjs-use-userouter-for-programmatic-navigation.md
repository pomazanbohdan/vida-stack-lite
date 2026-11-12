---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nuxtjs-use-userouter-for-programmatic-navigation
title: "Use useRouter for programmatic navigation"
summary: "Navigate programmatically"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Link guidance for nuxtjs 4.5."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nuxtjs.csv; sha256=3d9b54ed2d151bd9c86e9e5609b8a6f88a00c4c52fa601a30af96c49b2c4d176; locator=stacks/nuxtjs.csv#L45"
status: active
revision: 1
---

# Use useRouter for programmatic navigation

Navigate programmatically

**Do:** useRouter().push() for navigation

**Don't:** Direct window.location

**Applies To:** nuxtjs 4.5

**Severity:** Medium

**Good example:**

```text
const router = useRouter(); router.push('/dashboard')
```

**Bad example:**

```text
window.location.href = '/dashboard'
```
