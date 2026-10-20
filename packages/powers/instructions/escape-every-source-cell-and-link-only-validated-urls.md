---
instruction_id: escape-every-source-cell-and-link-only-validated-urls
title: Escape every source cell and link only validated URLs
summary: "Source addresses are untrusted content: every cell is escaped, every row anchored, and only a validated http(s) address becomes a link."
capability_tags:
  - harden-security-controls
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: Source-derived text is about to be placed into a rendered page.
conditions_does_not_apply_when: The page contains no source-derived text.
artifact_contract_output_type: source-escaping
artifact_contract_required_data:
  - the escaped cells
  - the linked addresses
  - the addresses left as plain text
artifact_contract_verified_by: every cell is escaped and only validated http(s) addresses are linked
compatibility_excludes: []
compatibility_requires:
  - keep-untrusted-values-out-of-code-and-queries
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/html-briefing.md
status: active
revision: 1
---

# Escape every source cell and link only validated URLs
- Source URLs are untrusted content — never hand-escape them
- which escapes every cell, anchors each row (`id="src-n"`), and links only validated `http(s)` URLs (anything else renders as plain text; the script lists it in `invalid_urls`).
- Apply the same escape discipline to any other source-derived text you place in attributes.
