---
instruction_id: keep-verbatim-quotes-and-redact-identities
title: Keep the verbatim quotes and redact the identities
summary: "Keep the user's own words verbatim, because a paraphrase destroys the evidence, and never let usernames, handles, emails or identifying links into the report or the working notes."
capability_tags:
  - redact-sensitive-data
pattern_tags:
  - evidence-redaction
conditions_applies_when: User words are quoted in a research result.
conditions_does_not_apply_when: No user words are quoted; the finding is a metric or a count.
artifact_contract_output_type: redacted-quote
artifact_contract_required_data:
  - the verbatim quote
  - the redaction applied
artifact_contract_verified_by: "the quote is verbatim and carries no username, handle, email or identifying link"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/user-voice.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/forensics.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
  - operations
---

# Keep the verbatim quotes and redact the identities
keep verbatim quotes, redacted — user words carry evidence paraphrase destroys
but usernames, handles, emails, and identifying links never enter the report or the working notes
Replace absolute paths with relative paths (strip `$HOME` prefix)
Remove any API keys, tokens, or credentials found in git diff output
Truncate large diffs to first 50 lines
