---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-html-tailwind-long-token-resilience
title: "Long token resilience"
summary: "Allow URLs identifiers and user content to break without widening flex layouts"
capability_tags:
  - set-web-type
pattern_tags:
  - type-context
conditions_applies_when: "Typography guidance for html-tailwind 4.3."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/html-tailwind.csv; sha256=d05a581d20af57b8ca0104a6d31d90a07c437d500662a96c3029fc2f9a4678ee; locator=stacks/html-tailwind.csv#L59"
status: active
revision: 1
---

# Long token resilience

Allow URLs identifiers and user content to break without widening flex layouts

**Do:** Use wrap-anywhere on unpredictable text and min-w-0 on its flexible parent

**Don't:** Use break-all globally or keep the flex child at its intrinsic minimum

**Applies To:** html-tailwind 4.3

**Severity:** High

**Good example:**

```text
flex min-w-0 with wrap-anywhere
```

**Bad example:**

```text
flex with whitespace-nowrap
```
