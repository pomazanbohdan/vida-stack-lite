---
instruction_id: locate-the-installation-boundary
title: Locate the installation boundary
summary: "The boundary that owns the manifest and the dependency graph is found first, its package manager, lockfile and CI commands are corroborated, and a disagreement stops the work."
capability_tags:
  - harden-security-controls
pattern_tags:
  - supply-chain-gating
conditions_applies_when: "Dependencies are about to be installed, audited or upgraded."
conditions_does_not_apply_when: The work installs nothing and changes no dependency.
artifact_contract_output_type: installation-boundary-note
artifact_contract_required_data:
  - the boundary root
  - the package manager
  - the lockfile
  - the CI install command
artifact_contract_verified_by: "the manager, the lockfile and the CI command agree at the boundary, and a disagreement stops the work"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Locate the installation boundary
First locate the **installation boundary**. If the package is matched by a parent `workspaces` declaration, use that workspace root; otherwise use the nearest project root that owns both its manifest and dependency graph.
At that boundary, corroborate `packageManager` (when present), the lockfile, and CI commands. Stop if they disagree or competing manager lockfiles exist there.
A nested project is independent only when it is outside the parent workspace; independent subprojects may legitimately use different managers.
For an unlisted manager or version, consult its official documentation; do not substitute another manager's commands or newer defaults.
