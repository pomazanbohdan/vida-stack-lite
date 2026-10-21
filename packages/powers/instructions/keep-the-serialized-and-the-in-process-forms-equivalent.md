---
instruction_id: keep-the-serialized-and-the-in-process-forms-equivalent
title: Keep the serialized and the in-process forms equivalent
summary: The form that crosses a wire and the form that runs in one process produce the same result; a change that breaks that equivalence is a breaking change.
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A contract has an in-process form and a form that is serialized across a boundary.
conditions_does_not_apply_when: The contract has only one form.
artifact_contract_output_type: form-equivalence
artifact_contract_required_data:
  - the two forms
  - the result they must share
  - what a divergence means
artifact_contract_verified_by: both forms produced the same result and the equivalence is asserted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/host-integration-interface.md
status: active
revision: 1
---

# Keep the serialized and the in-process forms equivalent
- The two are consistent: a serialized request yields the same `effective` axes as the in-process call.
- All five satisfy a common `{ kind, runtime, install, uninstall }` shape and are constructed fail-closed (they throw if a required host primitive is absent):
