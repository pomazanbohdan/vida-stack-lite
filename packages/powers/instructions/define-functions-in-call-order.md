---
instruction_id: define-functions-in-call-order
title: Define functions in call order
summary: "Functions are defined top to bottom in call order: a caller comes above the callee it calls."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Functions are written or reordered in a source file.
conditions_does_not_apply_when: The file holds no function.
artifact_contract_output_type: source-order
artifact_contract_required_data:
  - the caller
  - the callee
  - the order the two are defined in
artifact_contract_verified_by: every caller is defined above the callee it calls
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs-site/javascript-conventions.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Define functions in call order
Define functions top-to-bottom in call order: callers above callees.
If `install()` calls `_initPaths()`, then `install` appears first and `_initPaths` appears after it.
