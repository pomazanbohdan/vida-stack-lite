---
instruction_id: confine-the-predicate-path-to-the-project-root
title: Confine the predicate path to the project root
summary: A path that a check receives is resolved inside the project root before the check runs; one that escapes is a usage error and is not evaluated.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A check is about to receive a path that comes from the caller.
conditions_does_not_apply_when: The path is produced inside the project by the program itself.
artifact_contract_output_type: predicate-path-confinement
artifact_contract_required_data:
  - the path that is validated
  - the root it must resolve inside
  - what an escaping path does
artifact_contract_verified_by: the escaping path was refused before the check ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gate-predicates.md
status: active
revision: 1
---

# Confine the predicate path to the project root
- **`--phase-dir` is confined to the project.** The value is validated to resolve inside the project root before any predicate is evaluated; one that escapes is rejected as a usage error rather than evaluated.
- An absolute path inside the project is still accepted; absolute is not a synonym for escaping.
