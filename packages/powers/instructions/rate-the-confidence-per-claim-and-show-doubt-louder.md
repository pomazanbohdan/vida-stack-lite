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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/verification.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/references/html-briefing.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.compact.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.md
status: active
revision: 2
---

# Rate the confidence per claim and show doubt louder
Confidence rendered in the report: **high** (verified, fresh, credible publishers), **medium** (single credible source, fresh), **low** (stale, weak publisher, or disputed) — plus the explicit `unverified` flag. Confidence is per-claim, never per-section.
- every claim carries its badge — verified / medium / low / `unverified` / disputed — color-coded with the status text always present (never color alone). Unverified and disputed must be *more* prominent than verified, not less.

Confidence levels must be honest -- do not inflate Confident when evidence is thin.
Minimize Unclear items by reading more files before giving up.
**Never present LOW confidence findings as authoritative.**
