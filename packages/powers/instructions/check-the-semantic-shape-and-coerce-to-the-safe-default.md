---
instruction_id: check-the-semantic-shape-and-coerce-to-the-safe-default
title: Check the semantic shape and coerce to the safe default
summary: "At a trust boundary, check the type and the semantic shape; coerce a value that fails either to the contract's safe default instead of propagating it."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: An untrusted or externally supplied value crosses into the system and is normalized.
conditions_does_not_apply_when: The value is already inside the system and the boundary check has run.
artifact_contract_output_type: boundary-normalization
artifact_contract_required_data:
  - the type check
  - the semantic-shape check
  - the safe default the invalid value is coerced to
artifact_contract_verified_by: a value that is the right type but breaks the field contract is coerced to the safe default and never propagated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/adr/227-input-validation-shape-not-just-type.md
status: active
revision: 1
---

# Check the semantic shape and coerce to the safe default
Defensive normalization at any trust boundary MUST validate two layers:
1. **Type** — `typeof`, `instanceof`, `Array.isArray`, schema-type check
2. **Semantic shape** — regex, schema, range, or enum check that proves the value satisfies the field's contract
On failure of **either** layer, the value MUST be silently coerced to the contract's safe default (typically `undefined` or `null`).
It MUST NOT be propagated.
Throw only if the surrounding codebase treats throws as a normal-flow signal (it usually does not — dispatch pipelines must remain continuous).
Both layers are required.
A type check alone is necessary but not sufficient.
Type-only checks leave the harder bug class open.
A string is not a UUID; a string is not a semver.
The type check is the floor, not the ceiling.
Silent coercion hides invalid inputs from callers — a buggy upstream component may send garbage and never learn it was rejected.
Mitigate with an opt-in debug log.
That surfaces the coercion without affecting production behavior.
