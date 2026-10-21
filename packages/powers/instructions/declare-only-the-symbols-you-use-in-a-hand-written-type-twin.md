---
instruction_id: declare-only-the-symbols-you-use-in-a-hand-written-type-twin
title: Declare only the symbols you use in a hand-written type twin
summary: "A type declaration that has no upstream to copy declares only the symbols the code actually uses, and the ones it leaves out stay unreachable at compile time."
capability_tags:
  - minimize-code-surface
pattern_tags:
  - code-minimization
conditions_applies_when: A type declaration is written by hand because the upstream ships none.
conditions_does_not_apply_when: The upstream ships a declaration that can be copied.
artifact_contract_output_type: minimal-type-twin
artifact_contract_required_data:
  - the symbols that are declared
  - the symbols that stay unreachable
  - why the narrowness is deliberate
artifact_contract_verified_by: only the used symbols are declared and the rest stayed unreachable
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/bin/lib/vendor/README.md
status: active
revision: 1
---

# Declare only the symbols you use in a hand-written type twin
- declares only the symbols actually used (`load`, `dump`, `FAILSAFE_SCHEMA`, `YAMLException`), and is **excluded** from `lint-vendored-deps.cjs`'s byte-compare — there is no upstream file to compare it against.
- The narrowness is deliberate: anchors, aliases, custom types and `loadAll` are unreachable from typed code
