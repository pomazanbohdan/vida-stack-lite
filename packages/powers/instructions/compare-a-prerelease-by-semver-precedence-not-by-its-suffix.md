---
instruction_id: compare-a-prerelease-by-semver-precedence-not-by-its-suffix
title: "Compare a prerelease by semver precedence, not by its suffix"
summary: "A release candidate is compared with the other versions by the normal precedence rules, and its suffix never makes it look like a development install or something that is behind."
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - supply-chain-gating
conditions_applies_when: The version that is available carries a prerelease suffix.
conditions_does_not_apply_when: Every version compared is a final release.
artifact_contract_output_type: version-comparison
artifact_contract_required_data:
  - the installed version
  - the available version
  - the precedence between them
artifact_contract_verified_by: the comparison follows the normal precedence rules and the prerelease is offered as an available update
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update/steps/channel-banner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Compare a prerelease by semver precedence, not by its suffix
Apply standard semver precedence for prereleases (`1.4.0-rc.1` is newer than `1.3.1` but older than the final `1.4.0`).
Do NOT treat an `-rc.N` suffix as a dev install or as "behind" — offer it as an available update.
