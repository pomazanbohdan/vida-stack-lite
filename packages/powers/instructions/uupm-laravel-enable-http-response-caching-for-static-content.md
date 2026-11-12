---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-enable-http-response-caching-for-static-content
title: "Enable HTTP response caching for static content"
summary: "Cache control headers for pages that rarely change"
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Performance guidance for laravel 13.x."
conditions_does_not_apply_when: A context where the platform convention or the stated exception makes the rule unsafe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface applies the stated rule and the result is checked against the source guideline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L46"
status: active
revision: 1
---

# Enable HTTP response caching for static content

Cache control headers for pages that rarely change

**Do:** Cache-Control headers via middleware for public pages

**Don't:** No caching — serve every response fresh

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
response()->view('home')->header('Cache-Control', 'public, max-age=3600')
```

**Bad example:**

```text
No cache headers on marketing pages
```
