---
instruction_id: design-a-standing-egress-channel-as-a-single-consent
title: Design a standing egress channel as a single consent
summary: "A channel that receives data on every run is consented once; disclosure makes it visible and revocable, not safe."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A component receives data from the user on every run.
conditions_does_not_apply_when: The component only reads local files.
artifact_contract_output_type: consent-disclosure
artifact_contract_required_data:
  - what the channel receives
  - the disclosure shown at install
artifact_contract_verified_by: the disclosure names what is sent and the consent covers the standing channel
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/ship-a-reviewer-lane.md
status: active
revision: 1
---

# Design a standing egress channel as a single consent
consent-at-install is a **weaker gate for a standing egress channel than for a hook**
A user consents once; your lane thereafter receives every plan on every review run.
Design your lane as if that single consent is the only one you will ever get, because it is.
