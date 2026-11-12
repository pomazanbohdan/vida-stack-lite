---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-use-signed-urls-for-temporary-links
title: "Use signed URLs for temporary links"
summary: "Generate expiring URLs for private downloads or email confirmations"
capability_tags:
  - design-user-interface
pattern_tags:
  - design-system-adherence
conditions_applies_when: "Security guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L50"
status: active
revision: 1
---

# Use signed URLs for temporary links

Generate expiring URLs for private downloads or email confirmations

**Do:** URL::signedRoute() or temporarySignedRoute()

**Don't:** Expose sequential IDs in download URLs without auth

**Applies To:** laravel 13.x

**Severity:** High

**Good example:**

```text
URL::temporarySignedRoute('file.download' now()->addMinutes(30) ['file' => $id])
```

**Bad example:**

```text
route('file.download' $id) with no expiry or signature
```
