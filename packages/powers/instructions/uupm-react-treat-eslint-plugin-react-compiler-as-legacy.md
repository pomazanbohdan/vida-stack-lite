---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-react-treat-eslint-plugin-react-compiler-as-legacy
title: "Treat eslint-plugin-react-compiler as legacy"
summary: "The React Compiler release recommends eslint-plugin-react-hooks instead of the older compiler-only lint package."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - package-lifecycle
conditions_applies_when: "Tooling guidance for react legacy."
conditions_does_not_apply_when: A context where the framework version or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/react.csv; sha256=4dd176a9787e5c6306b5df94158d75955adcdc6edab41ce5286641a5842303c1; locator=stacks/react.csv#L62"
status: active
revision: 1
---

# Treat eslint-plugin-react-compiler as legacy

The React Compiler release recommends eslint-plugin-react-hooks instead of the older compiler-only lint package.

**Do:** Use eslint-plugin-react-hooks recommended presets

**Don't:** Standardize on eslint-plugin-react-compiler

**Applies To:** react legacy

**Severity:** Medium

**Good example:**

```text
plugin:react-hooks/recommended
```

**Bad example:**

```text
eslint-plugin-react-compiler
```
