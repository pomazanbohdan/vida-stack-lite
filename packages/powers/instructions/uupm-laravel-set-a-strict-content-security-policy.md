---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: h2-csv-pilot-not-classified
instruction_id: uupm-laravel-set-a-strict-content-security-policy
title: "Set a strict Content Security Policy"
summary: "CSP headers prevent XSS injection of external scripts"
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
  - "donor=uupm; license=MIT; revision=56ea9cf174ed86786187daa9de0e6247cb0747e4; path=stacks/laravel.csv; sha256=854ea4daa5fc61292d22235ad33b49ba3fe22423c3de8d3cb03758ffed3b59f9; locator=stacks/laravel.csv#L51"
status: active
revision: 1
---

# Set a strict Content Security Policy

CSP headers prevent XSS injection of external scripts

**Do:** spatie/laravel-csp or custom middleware to emit CSP header

**Don't:** No CSP — browser runs any injected script

**Applies To:** laravel 13.x

**Severity:** Medium

**Good example:**

```text
Header: Content-Security-Policy: default-src 'self'; script-src 'self'
```

**Bad example:**

```text
No Content-Security-Policy header on responses
```
