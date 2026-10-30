---
instruction_id: name-every-timeout-in-a-shared-constant
title: Name every timeout in a shared constant
summary: "A bare numeric timeout at a call site is replaced by a named constant, so two copies of the same timeout cannot drift or collide."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-design
conditions_applies_when: A call site passes a numeric timeout or timeout option.
conditions_does_not_apply_when: The value comes from a named constant or from a configuration entry.
artifact_contract_output_type: timeout-constant
artifact_contract_required_data:
  - the named constant
  - the class of work the timeout covers
  - the reason a local constant is a distinct class
artifact_contract_verified_by: no call site passes a bare numeric timeout literal
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=TESTING-STANDARDS.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Name every timeout in a shared constant
Do not write a bare numeric `timeout`/`timeoutMs` option value at a test call site.
Two independently-guessed copies of the same magic number can silently drift apart, or worse, collide exactly and produce a zero-margin race
Import an existing class-norm constant
when the call is the same class of subprocess, or declare a local one with a comment justifying why it is a distinct class
A non-literal value (an `Identifier`, `MemberExpression`, or `CallExpression`) is trusted; only a resolvable numeric literal is flagged.
There is no marker-comment escape — the fix is always to extract a named constant.
There is no allowlist.
