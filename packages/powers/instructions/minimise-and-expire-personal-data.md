---
instruction_id: minimise-and-expire-personal-data
title: Minimise and expire personal data
summary: "Personal data is classified, collected for a stated purpose, kept to a retention limit and can be deleted everywhere it was written."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work collects, stores or shares personal data."
conditions_does_not_apply_when: The work handles no personal data.
artifact_contract_output_type: personal-data-review
artifact_contract_required_data:
  - the data classes
  - the purpose of each collection
  - the retention limit
  - the deletion path
  - the sharing agreements
artifact_contract_verified_by: the retention limit and a working deletion path exist for every class of personal data
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Minimise and expire personal data
PII encrypted at rest (if required by regulation)
HTTPS for all external communication
Database backups encrypted
Personal data is classified, collected against a stated purpose, and minimized
Personal data has a retention limit and a working deletion path (incl. backups, caches, indexes)
Export/delete (data-subject) requests are supported where required; third-party sharing has consent and a data-processing agreement
