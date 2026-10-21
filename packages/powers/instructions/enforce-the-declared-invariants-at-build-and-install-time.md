---
instruction_id: enforce-the-declared-invariants-at-build-and-install-time
title: Enforce the declared invariants at build time and at install time
summary: "The invariants a declaration must satisfy are checked when the artifact is built and again when it is installed, by the same validation the registry uses."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A set of invariants is declared for a manifest or a contract.
conditions_does_not_apply_when: The invariants are only written down in prose.
artifact_contract_output_type: declared-invariants
artifact_contract_required_data:
  - the invariants
  - where they are checked
  - the validation that checks them
artifact_contract_verified_by: the invariants are enforced at build time and at install time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/capability-manifest.md
status: active
revision: 1
---

# Enforce the declared invariants at build time and at install time
- The following invariants are enforced at **build time** by `scripts/gen-capability-registry.cjs` and at **install time** by the runtime-callable `validateCapability()` / `validateCrossCapability()`
- **`requires` exist and are acyclic.** Every `id` listed in `requires` must exist in the registry; the dependency graph must be acyclic.
