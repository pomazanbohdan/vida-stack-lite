---
instruction_id: never-hand-edit-a-vendored-artifact
title: Never hand-edit a vendored artifact
summary: "A vendored artifact is refreshed through the command that produced it, and a copy that drifts from its upstream is a build failure."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: A vendored copy of an upstream artifact is about to be changed.
conditions_does_not_apply_when: The artifact is written by the project itself.
artifact_contract_output_type: vendored-artifact
artifact_contract_required_data:
  - the refresh command
  - the upstream the copy is compared against
  - what a drift does
artifact_contract_verified_by: the artifact was refreshed by the command and the drift check stays green
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/bin/lib/vendor/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never hand-edit a vendored artifact
- Never edit these artifacts directly. Refresh bundled packages through the vendoring command above.
- fails CI if any vendored copy drifts byte-for-byte from its `node_modules` upstream
