---
instruction_id: keep-the-consent-record-outside-the-repository
title: Keep the consent record outside the repository
summary: "The record of what was consented to lives outside any repository and is bound to the project root, the bundle integrity and the disclosure signature, so a copied project file activates nothing."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A consent record is written or read.
conditions_does_not_apply_when: The consent record is kept in the repository it governs.
artifact_contract_output_type: external-consent-store
artifact_contract_required_data:
  - where the consent record lives
  - what it is bound to
  - what a copied project file activates
artifact_contract_verified_by: the consent record lives outside the repository and a copied project file activates nothing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/gsd-capability-command.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep the consent record outside the repository
- The store lives at `${GSD_HOME||homedir()}/.gsd/consent.json` — **outside any repository** — and records, per `(realpath(projectRoot), capability id)`, the bundle integrity and disclosure signature you consented to **on this machine**.
- A project-scope overlay is inactive until such a record exists (so a forged or cloned in-repo project ledger activates nothing on its own)
- `remove` already revokes consent as part of an uninstall; `trust revoke` is the way to withdraw consent **without** uninstalling the bundle.
