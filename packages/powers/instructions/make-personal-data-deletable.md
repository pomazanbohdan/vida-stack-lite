---
instruction_id: make-personal-data-deletable
title: Make personal data deletable
summary: "Every personal-data store needs a retention limit and a working deletion path, including the backups, the caches, the search indexes and the analytics copies."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: The system stores personal data.
conditions_does_not_apply_when: The system stores no personal data.
artifact_contract_output_type: retention-and-deletion
artifact_contract_required_data:
  - the retention limit of each store
  - the deletion path
  - the export and correction paths
artifact_contract_verified_by: "a deletion request removes the data from every store including the backups, the caches and the analytics copies"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Make personal data deletable

**Set retention up front, then actually delete.**
Every personal-data store needs a TTL and a working deletion path, including backups, caches, search indexes, and analytics copies.
**Support the data-subject rights your jurisdiction requires** (GDPR, CCPA, and kin): export, correct, delete.
Design the schema so a user's data is findable and erasable, not smeared irreversibly across systems.
