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
status: active
revision: 1
---

# Keep the verbatim quotes and redact the identities
keep verbatim quotes, redacted — user words carry evidence paraphrase destroys
but usernames, handles, emails, and identifying links never enter the report or the working notes
