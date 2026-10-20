---
instruction_id: treat-a-broad-impact-change-as-behavioral
title: Treat a broad-impact change as behavioral
summary: "A change to a dependency, a toolchain, a build setting or a data file is behavioral, even when no single changed line looks important."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - verification-before-completion
conditions_applies_when: A change is screened for behavioral effect and it touches something wider than one function.
conditions_does_not_apply_when: The change is confined to one function and the screen has already been done.
artifact_contract_output_type: behavioral-screen
artifact_contract_required_data:
  - the parts of the change
  - which of them are behavioral
artifact_contract_verified_by: "a change that touches a dependency, a toolchain, a build setting or a data file is counted as behavioral"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/references/lens-verification-gap.md
status: active
revision: 1
---

# Treat a broad-impact change as behavioral
Treat broad-impact changes as behavioral even when no single changed line looks important: dependency, toolchain, build/config, data-file, etc.
