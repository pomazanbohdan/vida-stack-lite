---
instruction_id: re-consent-only-when-the-executable-surface-changes
title: Re-consent only when the executable surface changes
summary: A new version re-triggers consent when the invocation surface changes and not when only a heading or a timeout changes.
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A new version of an installed component is offered.
conditions_does_not_apply_when: The executable surface of the new version is identical.
artifact_contract_output_type: consent-decision
artifact_contract_required_data:
  - the fields that changed
  - the consent the change requires
artifact_contract_verified_by: the consent is required exactly when the invocation surface changed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/ship-a-reviewer-lane.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/version-a-capability.md
status: active
revision: 1
---

# Re-consent only when the executable surface changes
Changing `binary`, `args`, `hostConfigKey`, `promptChannel`, or `handler` in a new version re-triggers consent on update. Changing `reviewsSection` or `timeoutFloorMs` does not — a cosmetic prompt is how users learn to click through.
This re-consent is required every time the surface changes, scoped to the declared executable surface of a specific version, so a changed surface is always a fresh `--yes`.
