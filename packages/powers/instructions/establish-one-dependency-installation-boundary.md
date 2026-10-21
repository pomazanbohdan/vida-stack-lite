---
instruction_id: establish-one-dependency-installation-boundary
title: Establish one dependency installation boundary
summary: "Use the workspace root that owns the lockfile, corroborate the declared manager with the lockfile and the build, and stop when they disagree."
capability_tags:
  - manage-dependency-supply-chain
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "Dependencies are installed, added or upgraded."
conditions_does_not_apply_when: No dependency is installed.
artifact_contract_output_type: installation-boundary
artifact_contract_required_data:
  - the owning workspace root
  - the lockfile
  - the pinned manager version
artifact_contract_verified_by: "the lockfile, the declared manager and the build agree on one boundary"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/contributing/bootstrap.md
status: active
revision: 2
---

# Establish one dependency installation boundary

**Find the installation boundary and manager.**
Use the workspace root that owns the lockfile, or an independent nested project only when it is outside that workspace.
Corroborate `packageManager` (when present), the lockfile, and CI; stop on disagreement or competing lockfiles.
Pin the manager version.
- A version manager ensures you can switch Node versions per project without polluting your global install.
- This project ships a `.nvmrc` file at the root — any of the tools above will read it.
