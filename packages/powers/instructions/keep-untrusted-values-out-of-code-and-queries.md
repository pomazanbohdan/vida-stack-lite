---
instruction_id: keep-untrusted-values-out-of-code-and-queries
title: Keep untrusted values out of code and queries
summary: "Untrusted values never become code: queries are parameterized, output is encoded, and model output never reaches an evaluator, a shell or a file path."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "Untrusted data reaches a query, a rendered page or an executable context."
conditions_does_not_apply_when: The work handles no untrusted data.
artifact_contract_output_type: injection-review
artifact_contract_required_data:
  - the untrusted values
  - where each one lands
  - the mechanism that keeps it out of code
artifact_contract_verified_by: "no untrusted value reaches an evaluator, a query string, a shell or a path without parameterisation or encoding"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Keep untrusted values out of code and queries
SQL queries parameterized (no string concatenation)
HTML output encoded (use framework auto-escaping)
Model output treated as untrusted — never into `eval`/SQL/shell/`innerHTML`/file paths
Injection | Parameterized queries, input validation
