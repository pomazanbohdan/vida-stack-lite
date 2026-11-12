---
schema: VPInstructionModule/v1
instruction_id: "module-bmad-method-skills-bmad-deep-recon-references-html-briefing-md-8a5d4df7-c01"
title: "bmad-method: skills/bmad-deep-recon/references/html-briefing.md module"
summary: "Carrier for 2 atomic instructions from bmad-method:skills/bmad-deep-recon/references/html-briefing.md."
source: "{\"donor\":\"bmad-method\",\"path\":\"skills/bmad-deep-recon/references/html-briefing.md\"}"
atom_ids:
  - escape-every-source-cell-and-link-only-validated-urls
  - rate-the-confidence-per-claim-and-show-doubt-louder
atom_count: 2
atoms: "[{\"atom_id\":\"escape-every-source-cell-and-link-only-validated-urls\",\"file_sha256\":\"babda5eebad1d81bce35593442abeb8bd6e870693216ece368689082b22c2361\",\"content_sha256\":\"b3e03d160388235454fd19a3c4fa244121a4b61382571c21dec09eaed52f6ebb\",\"file_bytes\":1594,\"body_bytes\":391},{\"atom_id\":\"rate-the-confidence-per-claim-and-show-doubt-louder\",\"file_sha256\":\"8f4d3dc08d399339e8017fc31b9c588df190e6249b5f1ceed2b80e6d19b61229\",\"content_sha256\":\"0d8acbe9f8dc556a19edff588a3b1c23170de5107cf14bd8df49a5c45fc86275\",\"file_bytes\":2518,\"body_bytes\":753}]"
carrier_sha256: 120dd2015003b5e535459f05567e229eb6202673d8f712420187a5b72d059936
carrier_bytes: 4435
revision: 1
status: active
---
<!-- vpmodule:atom:begin escape-every-source-cell-and-link-only-validated-urls -->
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
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/html-briefing.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Escape every source cell and link only validated URLs
- Source URLs are untrusted content — never hand-escape them
- which escapes every cell, anchors each row (`id="src-n"`), and links only validated `http(s)` URLs (anything else renders as plain text; the script lists it in `invalid_urls`).
- Apply the same escape discipline to any other source-derived text you place in attributes.
<!-- vpmodule:atom:end escape-every-source-cell-and-link-only-validated-urls -->
<!-- vpmodule:atom:begin rate-the-confidence-per-claim-and-show-doubt-louder -->
---
instruction_id: rate-the-confidence-per-claim-and-show-doubt-louder
title: Rate the confidence per claim and show doubt louder
summary: "Confidence is rated for each claim and never for a section, and a claim that is unverified or disputed must read louder than one that is verified."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A result that carries claims is about to be rendered.
conditions_does_not_apply_when: Nothing is being rendered for a reader.
artifact_contract_output_type: claim-confidence-rendering
artifact_contract_required_data:
  - the confidence per claim
  - the status text
  - the prominence given to the doubtful claims
artifact_contract_verified_by: "every claim carries its confidence and status text, and the doubtful claims are the most prominent"
compatibility_excludes: []
compatibility_requires:
  - never-use-colour-as-the-only-signal
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-deep-recon/references/html-briefing.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-assumptions-analyzer.compact.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=agents/gsd-project-researcher.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - research
---

# Rate the confidence per claim and show doubt louder
Confidence rendered in the report: **high** (verified, fresh, credible publishers), **medium** (single credible source, fresh), **low** (stale, weak publisher, or disputed) — plus the explicit `unverified` flag. Confidence is per-claim, never per-section.
- every claim carries its badge — verified / medium / low / `unverified` / disputed — color-coded with the status text always present (never color alone). Unverified and disputed must be *more* prominent than verified, not less.

Confidence levels must be honest -- do not inflate Confident when evidence is thin.
Minimize Unclear items by reading more files before giving up.
**Never present LOW confidence findings as authoritative.**
<!-- vpmodule:atom:end rate-the-confidence-per-claim-and-show-doubt-louder -->