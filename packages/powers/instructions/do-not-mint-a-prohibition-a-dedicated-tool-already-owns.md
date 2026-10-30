---
instruction_id: do-not-mint-a-prohibition-a-dedicated-tool-already-owns
title: Do not mint a prohibition a dedicated tool already owns
summary: "A canonical security or compliance constraint is a breadcrumb to the tool that owns it, not a newly minted prohibition."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: A surfaced constraint turns out to be a canonical security or compliance rule.
conditions_does_not_apply_when: The constraint is specific to this feature.
artifact_contract_output_type: canon-breadcrumb
artifact_contract_required_data:
  - the canonical rule
  - the tool that owns it
  - the one-line breadcrumb
artifact_contract_verified_by: no canonical rule was minted as a bespoke prohibition
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/prohibition-probe.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Do not mint a prohibition a dedicated tool already owns
Some kept candidates are not bespoke at all — they are **canon** security/compliance constraints that a dedicated tool already owns. Do NOT mint a prohibition for them. Instead emit a one-line breadcrumb and stop
Minting canon items both duplicates other tooling and drowns the bespoke signal
