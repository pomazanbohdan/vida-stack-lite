---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-nextjs-use-app-router-for-new-projects
title: "Use App Router for new projects"
summary: "App Router is the recommended approach in Next.js 14+"
capability_tags:
  - design-user-interface
pattern_tags:
  - interaction-simplification
conditions_applies_when: "Routing guidance for nextjs 16.2."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/nextjs.csv; sha256=ecd2c27b2ea0127d203ae726060efcdd7335b5e83f96b99e4f3befbbfeebd5a4; locator=stacks/nextjs.csv#L2"
status: active
revision: 1
---

# Use App Router for new projects

App Router is the recommended approach in Next.js 14+

**Do:** app/ directory with page.tsx

**Don't:** pages/ for new projects

**Applies To:** nextjs 16.2

**Severity:** Medium

**Good example:**

```text
app/dashboard/page.tsx
```

**Bad example:**

```text
pages/dashboard.tsx
```
