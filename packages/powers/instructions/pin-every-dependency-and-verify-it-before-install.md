---
instruction_id: pin-every-dependency-and-verify-it-before-install
title: Pin every dependency and verify it before install
summary: "Every third-party dependency is pinned through a lockfile and checked against the published checksum before it is installed, so what the pipeline installs is what was reviewed."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are about to be installed by a pipeline.
conditions_does_not_apply_when: The project has no dependencies.
artifact_contract_output_type: pinned-verified-install
artifact_contract_required_data:
  - the lockfile
  - the checksum verification
  - what the pipeline installs compared to what was reviewed
artifact_contract_verified_by: the dependencies were pinned and checksum-verified before the install
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Pin every dependency and verify it before install
- All third-party dependencies must be pinned via a lock file (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`) and verified against published checksums before install.
- Supply-chain attacks (e.g., dependency confusion, typosquatting) are mitigated by ensuring that what CI installs matches what maintainers reviewed.
