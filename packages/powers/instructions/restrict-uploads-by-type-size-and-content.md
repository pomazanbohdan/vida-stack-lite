---
instruction_id: restrict-uploads-by-type-size-and-content
title: "Restrict uploads by type, size and content"
summary: "Allowlist the media types, cap the size and verify the content, because the extension proves nothing."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The system accepts uploaded files.
conditions_does_not_apply_when: The system accepts no uploads.
artifact_contract_output_type: upload-policy
artifact_contract_required_data:
  - the allowed types
  - the size cap
  - the content check
artifact_contract_verified_by: "an upload outside the allowlist, above the cap or with the wrong content is rejected"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Restrict uploads by type, size and content

Uploads: allowlist MIME types, cap size, verify content (magic bytes) when it matters.
The extension proves nothing.
