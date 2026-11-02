---
instruction_id: degrade-to-the-most-restrictive-known-value-never-to-a-guessed-one
title: "Degrade to the most restrictive known value, never to a guessed one"
summary: An undeclared capability degrades to the most restrictive value the system already knows; it is never filled with a plausible default.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - safe-defaults
conditions_applies_when: A capability value could not be determined from an authoritative source.
conditions_does_not_apply_when: The value was determined.
artifact_contract_output_type: degraded-capability
artifact_contract_required_data:
  - the value that was not determined
  - the restrictive value used instead
artifact_contract_verified_by: the degraded value is the most restrictive known one and no value was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/add-or-update-a-host-integration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Degrade to the most restrictive known value, never to a guessed one
it validates, but `negotiateHostCapabilities` **fail-closes** on it (degrades to the most restrictive known value) — so it is always safe and never a silent capability claim.
