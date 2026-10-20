---
instruction_id: block-dependency-scripts-until-reviewed
title: Block dependency scripts until they are reviewed
summary: "Dependency lifecycle scripts never run before they are read: the install starts with scripts disabled, each script is inspected, and the narrow policy is committed at the boundary."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are installed on a client whose defaults have not been verified.
conditions_does_not_apply_when: No dependency is installed.
artifact_contract_output_type: install-script-gate-record
artifact_contract_required_data:
  - the bootstrap with scripts disabled
  - the scripts inspected with their versions
  - the recorded allow/deny policy
  - the clean frozen install that still builds
artifact_contract_verified_by: "the scripts were blocked before their first execution and approved only through the pinned manager's own policy"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Block dependency scripts until they are reviewed
Never discover dependency lifecycle scripts by first executing an ordinary install on a client whose defaults have not been verified.
Bootstrap with dependency scripts disabled, or with a documented default-deny policy plus fail-closed enforcement.
Inspect the exact script source and package version before approval.
Record the narrowest native allow/deny policy at the installation boundary and commit it.
Run a clean frozen/immutable install with that policy and verify the required packages still build.
Dependency lifecycle scripts are blocked before first execution and approved only through the pinned manager's native policy
