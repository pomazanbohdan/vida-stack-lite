---
instruction_id: make-an-opt-in-flag-require-the-exact-value
title: Make an opt-in flag require the exact value
summary: "An opt-in flag is on only when its value is exactly the expected one, so a mistyped value gets the conservative behaviour; the fallback polarity is chosen per setting, failing open where that preserves the intent and closed where the default exists to prevent the action."
capability_tags:
  - write-configuration-override
pattern_tags:
  - safe-defaults
conditions_applies_when: A configuration value switches a behavior on and the value may be mistyped.
conditions_does_not_apply_when: The setting has no opt-in direction.
artifact_contract_output_type: opt-in-decision
artifact_contract_required_data:
  - the value read
  - the exact value that counts as on
  - the behaviour that resulted
artifact_contract_verified_by: a value other than the exact one left the conservative behaviour in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Make an opt-in flag require the exact value
STRICT equality on "true" is deliberate — "1", "yes" and
must NOT opt in, so a mistyped config gets the conservative behaviour rather than firing
concurrent requests at a rate-limited provider
which fails OPEN: there, failing open preserves
the user's intent; here it would fire exactly the requests the default exists to prevent
