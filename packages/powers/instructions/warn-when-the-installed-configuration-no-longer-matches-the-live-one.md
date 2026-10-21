---
instruction_id: warn-when-the-installed-configuration-no-longer-matches-the-live-one
title: Warn when the installed configuration no longer matches the live one
summary: "A configuration that was fixed at install time and is changed afterwards produces a warning, because the host stays silently stale until the next install."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - claim-freshness-window
conditions_applies_when: A configuration that was baked in at install time has changed.
conditions_does_not_apply_when: The configuration is resolved live on every invocation.
artifact_contract_output_type: stale-install-warning
artifact_contract_required_data:
  - the configuration that changed
  - the install that made it stale
  - the warning the operator gets
artifact_contract_verified_by: the stale install was reported instead of being left silently out of date
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/embeddable-orchestration-system.md
status: active
revision: 1
---

# Warn when the installed configuration no longer matches the live one
- If the model configuration changes after install, a declarative host is silently stale until the next reinstall — which is why GSD warns when a declarative host's model configuration changes without a matching reinstall (#1688).
