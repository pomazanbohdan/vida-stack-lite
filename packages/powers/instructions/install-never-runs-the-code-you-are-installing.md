---
instruction_id: install-never-runs-the-code-you-are-installing
title: Install never runs the code you are installing
summary: "Installation stages files and validates the manifest; no hook fires, no module is loaded and no server is started, so the user has a window to inspect before anything runs."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: An extension is about to be installed from an outside source.
conditions_does_not_apply_when: The extension is the shipped package itself.
artifact_contract_output_type: copy-only-staging
artifact_contract_required_data:
  - what installation does
  - what it does not start
  - when the executable surface first runs
artifact_contract_verified_by: installation copied and validated files and started nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-trust-model.md
status: active
revision: 1
---

# Install never runs the code you are installing
- GSD takes a stronger position: **install never executes capability code**, full stop. Installation is a copy-only staging operation. There is no `postinstall`-equivalent.
- No hook fires, no module is `require()`'d, no MCP server is started. The executable surfaces remain inert until the first loop event fires after consent.
