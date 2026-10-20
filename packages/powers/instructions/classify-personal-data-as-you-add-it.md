---
instruction_id: classify-personal-data-as-you-add-it
title: Classify personal data as you add it
summary: "Tag every new field as non-personal, personal or sensitive, because data you cannot find cannot be protected or erased."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: A field is added that may hold personal data.
conditions_does_not_apply_when: The field carries no personal data.
artifact_contract_output_type: data-classification
artifact_contract_required_data:
  - the fields
  - the class of each
  - the handling of each class
artifact_contract_verified_by: every new field carries a class and the handling that follows from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 1
---

# Classify personal data as you add it

**Classify fields as you add them** (non-personal, PII, sensitive) and handle each class accordingly.
You cannot protect, or honor a deletion request for, data you cannot find.

| Class | Examples | Handling |
|---|---|---|
| **Non-personal** | Aggregates, anonymized counts | Normal handling |
| **Personal (PII)** | Name, email, IP, device/user IDs | Minimize, access-control, include in export/delete |
| **Sensitive** | Health, finance, location, biometrics, gov IDs, anything about minors | Extra basis to collect, stricter access, often encryption + audit logging |
