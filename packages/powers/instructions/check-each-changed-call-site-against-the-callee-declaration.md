---
instruction_id: check-each-changed-call-site-against-the-callee-declaration
title: Check each changed call site against the callee declaration
summary: "Every call site the change touches is checked against the declaration of what it calls: the arguments, their order, their types and the defaults."
capability_tags:
  - review-code
pattern_tags:
  - exhaustive-path-enumeration
conditions_applies_when: The change adds or changes a call.
conditions_does_not_apply_when: The change changes no call.
artifact_contract_output_type: call-contract-findings
artifact_contract_required_data:
  - the call site
  - the callee declaration
  - the mismatch
artifact_contract_verified_by: every changed call site was checked against the declaration it calls
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/review-prompts/edge-case-hunter.md
status: active
revision: 1
---

# Check each changed call site against the callee declaration
For each call site the diff adds or changes — in test files as well as production code — read the callee's declaration and check the call against it: argument count, order, types, and defaults. Report any mismatch
Ignore the rest of the codebase unless the provided content explicitly references external functions.
