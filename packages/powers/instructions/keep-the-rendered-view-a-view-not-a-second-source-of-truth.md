---
instruction_id: keep-the-rendered-view-a-view-not-a-second-source-of-truth
title: "Keep the rendered view a view, not a second source of truth"
summary: "The rendered page is a full-fidelity presentation of the document, self-contained and offline; the document stays the single place the content lives."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report is also rendered as a page.
conditions_does_not_apply_when: The report is delivered as text only.
artifact_contract_output_type: report-rendering
artifact_contract_required_data:
  - the rendered page
  - the claim that it carries no content of its own
artifact_contract_verified_by: "the page carries the same claims, numbers and citations as the document and renders offline from a single file"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/finalize.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/html-briefing.md
status: active
revision: 1
---

# Keep the rendered view a view, not a second source of truth
The page is a full-fidelity presentation of the report, never a second source of truth — same claims, same numbers, same citations; nothing is lost by reading it instead of the markdown.
**Self-contained single file**: inline CSS and JS, no external requests of any kind (no CDN, no fonts, no remote images). It must render from a `file://` open, offline, forever.
**Charts sparingly**: only where the data genuinely benefits (market size trajectory, decision matrix scores) — simple inline SVG, labeled axes, no library.
`<folder name>.md` always exists — the briefing is its regenerable face.
