---
instruction_id: name-the-call-that-invalidates-a-re-checked-handle
title: Name the call that invalidates a re-checked handle
summary: "Where the change re-checks something it already holds, the call that can invalidate it is named, together with what the change silently skips when the re-check fails."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: "The change re-checks, re-fetches or re-validates a handle, an index, an id or a pointer it already holds."
conditions_does_not_apply_when: The change holds no value it re-checks.
artifact_contract_output_type: handle-lifetime-findings
artifact_contract_required_data:
  - the value held
  - the call that invalidates it
  - what the change skips when the re-check fails
artifact_contract_verified_by: the invalidating call and the skipped path are both named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/review-prompts/edge-case-hunter.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-code-review/review-prompts/edge-case-hunter.md
status: active
revision: 2
---

# Name the call that invalidates a re-checked handle
Consider handle lifetime: when the changed code re-checks, re-fetches, or re-validates something it already held — a handle, index, id, pointer — the re-check exists because an intervening call can invalidate it
Identify that call, what it does to the thing held, and what the changed code silently skips when the re-check fails
