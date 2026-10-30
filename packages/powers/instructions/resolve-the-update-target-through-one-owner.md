---
instruction_id: resolve-the-update-target-through-one-owner
title: Resolve the update target through one owner
summary: "The scope, the runtime and the installed version come from the one projection that owns them; they are not re-derived by hand."
capability_tags:
  - find-the-project-tooling
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The current installation has to be identified before it can be updated.
conditions_does_not_apply_when: The installation is unambiguous and already known.
artifact_contract_output_type: install-context
artifact_contract_required_data:
  - the resolved scope
  - the resolved runtime
  - the resolved version
artifact_contract_verified_by: the context came from the owner of that cascade and not from a hand-written derivation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resolve the update target through one owner
**Do NOT re-derive scope, runtime, or version by hand** — `update-context` owns that cascade in tested code
If multiple runtime installs are detected and the invoking runtime cannot be determined from execution_context, ask the user which runtime to update before running install.
