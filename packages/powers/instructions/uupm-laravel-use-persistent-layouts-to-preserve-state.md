---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-persistent-layouts-to-preserve-state
title: "Use persistent layouts to preserve state"
summary: "Wrap pages in a persistent layout so header/sidebar don't remount"
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Inertia.js guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L22"
status: active
revision: 1
---

# Use persistent layouts to preserve state

Wrap pages in a persistent layout so header/sidebar don't remount

**Do:** layout property on page component for persistent UI

**Don't:** Re-render full layout on every page visit

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
MyPage.layout = (page) => <AppLayout>{page}</AppLayout>
```

**Bad example:**

```text
No layout — full page reload feel on navigation
```
