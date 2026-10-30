---
instruction_id: refer-a-canon-control-instead-of-minting-a-duplicate
title: Refer a canon control instead of minting a duplicate
summary: "A candidate that a canon process already owns is referred to that process in one line and dropped, instead of being written a second time."
capability_tags:
  - harden-security-controls
pattern_tags:
  - single-source-of-truth
conditions_applies_when: "A prohibition candidate turns out to be owned by another, already existing control."
conditions_does_not_apply_when: The candidate is specific to this piece of work.
artifact_contract_output_type: canon-referral
artifact_contract_required_data:
  - the candidate
  - the process that owns it
  - the one-line breadcrumb
artifact_contract_verified_by: the canon item was referred and not written a second time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
---

# Refer a canon control instead of minting a duplicate
A kept candidate that is canon security/compliance (OWASP / prototype-pollution / path-traversal / injection / GDPR / generic fairness) is NOT minted here — emit a one-line breadcrumb and DROP it.
