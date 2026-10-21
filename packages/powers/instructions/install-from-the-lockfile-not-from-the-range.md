---
instruction_id: install-from-the-lockfile-not-from-the-range
title: "Install from the lockfile, not from the range"
summary: "Dependencies are installed from the committed lockfile, and a regenerated lockfile is inspected before it is committed."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: Dependencies are about to be installed in a working tree.
conditions_does_not_apply_when: The project has no lockfile and the install is the first one.
artifact_contract_output_type: locked-install
artifact_contract_required_data:
  - the lockfile that is installed from
  - the command used
  - what is checked before the lockfile is committed
artifact_contract_verified_by: the install came from the lockfile and the regenerated lockfile was inspected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/bootstrap.md
status: active
revision: 1
---

# Install from the lockfile, not from the range
- `npm ci` is required over `npm install`. It installs exactly what `package-lock.json` specifies and fails fast if the lockfile is out of sync — this is intentional.
- Do NOT commit a regenerated lockfile without verifying no unexpected packages changed.
