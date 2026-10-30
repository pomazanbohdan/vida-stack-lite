---
instruction_id: keep-a-deprecated-root-readable-but-not-written
title: Keep a deprecated root readable but not written
summary: "A root that is kept only for legacy migration is still reported by the inventory, but nothing new is written there."
capability_tags:
  - distribute-a-package-of-skills
pattern_tags:
  - package-lifecycle
conditions_applies_when: A legacy root is still present and the inventory runs.
conditions_does_not_apply_when: The root is being removed and nothing references it.
artifact_contract_output_type: deprecated-root
artifact_contract_required_data:
  - the legacy root
  - what the inventory reports
  - what is never written there
artifact_contract_verified_by: the legacy root was reported and nothing was written to it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/skills/discovery-contract.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Keep a deprecated root readable but not written
- This root is kept for legacy migration only. Inventory code may report it, but new installs should not write here.
- Discovery code only checks whether it exists so inventory can report legacy Claude installs.
